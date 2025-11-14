/**
 * POST /api/query-stream
 * Streaming RAG query endpoint: similarity search + streaming LLM answer generation
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { embedWithOllama, generateStreamWithOllama } from '@/lib/ollama';
import { rankByCosine } from '@/lib/similarity';
import { buildContext, buildPrompt } from '@/lib/rag';

// Explicitly use Node.js runtime for file system access
export const runtime = 'nodejs';

// Configuration from environment
const TOP_K = parseInt(process.env.TOP_K || '5', 10);
const MAX_CONTEXT_CHARS = parseInt(process.env.MAX_CONTEXT_CHARS || '3000', 10);
const OLLAMA_LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'llama3';
const MAX_EMBEDDINGS_SEARCH = parseInt(process.env.MAX_EMBEDDINGS_SEARCH || '1000', 10);
// FTS5 prefilter limit: how many candidates to retrieve via BM25 before cosine (default: 200)
const PREFILTER_LIMIT = parseInt(process.env.PREFILTER_LIMIT || '200', 10);

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    // Parse request body
    const body = await request.json();
    const { question, conversationId } = body;

    // Validate question
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid question string is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate conversationId
    if (!conversationId || typeof conversationId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'No conversationId. Create a chat first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: `Conversation with id ${conversationId} not found` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }


    // Create question embedding
    const questionEmbeddings = await embedWithOllama([question]);
    if (questionEmbeddings.length === 0 || questionEmbeddings[0].length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to create question embedding' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const queryVector = questionEmbeddings[0];

    // Step 1: Use FTS5 to prefilter candidates via BM25 (fast full-text search)
    // Escape single quotes in the query for FTS5
    const ftsQuery = question.replace(/'/g, "''");
    
    let candidateChunkIds: number[] = [];
    
    try {
      // Query FTS5 virtual table to get top candidates by BM25 score
      // Filter to only documents in this conversation
      const ftsResults = await prisma.$queryRaw<Array<{ id: number; score: number }>>`
        SELECT rowid as id, bm25(chunk_fts) as score
        FROM chunk_fts
        WHERE chunk_fts MATCH ${ftsQuery}
          AND documentId IN (
            SELECT id FROM Document WHERE conversationId = ${conversationId}
          )
        ORDER BY score
        LIMIT ${PREFILTER_LIMIT}
      `;
      
      candidateChunkIds = ftsResults.map(r => r.id);
      console.log(`[Query Stream] FTS5 found ${candidateChunkIds.length} candidates via BM25`);
    } catch (ftsError) {
      console.error('[Query Stream] FTS5 prefilter failed, falling back to all chunks:', ftsError);
      // Fall back to fetching all chunks for this conversation
    }

    // Step 2: Fetch embeddings for the prefiltered chunks (or all if FTS5 failed/found nothing)
    const embeddings = await prisma.embedding.findMany({
      take: MAX_EMBEDDINGS_SEARCH,
      where: {
        chunk: {
          ...(candidateChunkIds.length > 0 
            ? { id: { in: candidateChunkIds } } 
            : {}
          ),
          document: {
            conversationId: conversationId,
          },
        },
      },
      include: {
        chunk: {
          include: {
            document: {
              select: {
                filename: true,
                conversationId: true,
              },
            },
          },
        },
      },
    });

    if (embeddings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No embedded content in this conversation yet. Upload some documents first.' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Query Stream] Processing ${embeddings.length} embeddings for cosine similarity`);

    // Build array for ranking
    const vectorRows = embeddings
      .filter((emb) => {
        const vec = emb.vector as number[];
        return Array.isArray(vec) && vec.length > 0;
      })
      .map((emb) => ({
        id: emb.chunkId,
        vector: emb.vector as number[],
        docId: emb.chunk.documentId,
        chunkIndex: emb.chunk.chunkIndex,
        filename: emb.chunk.document.filename,
        text: emb.chunk.text,
      }));

    // Rank by cosine similarity
    const chosen = rankByCosine(queryVector, vectorRows, TOP_K);

    // Build context from chosen chunks
    const { context, sources } = buildContext(
      chosen.map((c) => ({
        filename: c.filename,
        chunkIndex: c.chunkIndex,
        text: c.text,
      })),
      MAX_CONTEXT_CHARS
    );

    // Build prompt
    const prompt = buildPrompt(context, question);

    // Build sources with documentId and chunkId
    const sourcesWithDocId = sources.map((s) => {
      const matchedChunk = chosen.find(
        (c) => c.filename === s.filename && c.chunkIndex === s.chunkIndex
      );
      return {
        documentId: matchedChunk?.docId || 0,
        chunkId: matchedChunk?.id || 0,
        filename: s.filename,
        chunkIndex: s.chunkIndex,
      };
    });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let fullAnswer = '';

        try {
          // Send initial metadata
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'sources',
                sources: sourcesWithDocId,
                model: OLLAMA_LLM_MODEL,
              }) + '\n'
            )
          );

          // Stream the answer
          for await (const chunk of generateStreamWithOllama(prompt, request.signal)) {
            fullAnswer += chunk;
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'delta',
                  delta: chunk,
                }) + '\n'
              )
            );
          }

          // Persist messages to database after streaming completes
          try {
            // Create user message
            const userMessage = await prisma.message.create({
              data: {
                conversationId: conversationId,
                role: 'user',
                content: question,
              },
            });

            // Create assistant message
            const assistantMessage = await prisma.message.create({
              data: {
                conversationId: conversationId,
                role: 'assistant',
                content: fullAnswer,
              },
            });

            // Create message sources
            await Promise.all(
              sourcesWithDocId.map((source) =>
                prisma.messageSource.create({
                  data: {
                    messageId: assistantMessage.id,
                    documentId: source.documentId,
                    chunkId: source.chunkId,
                    filename: source.filename,
                    chunkIndex: source.chunkIndex,
                  },
                })
              )
            );

            // Update conversation timestamp
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            console.log('[Query Stream] Persisted messages for conversation:', conversationId);
          } catch (dbError) {
            console.error('[Query Stream] Error persisting messages:', dbError);
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'done',
                fullAnswer: fullAnswer,
              }) + '\n'
            )
          );

          controller.close();
        } catch (error: any) {
          console.error('[Query Stream] Error:', error);
          
          // Send error to client
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'error',
                error: error.message || 'An error occurred during streaming',
              }) + '\n'
            )
          );
          
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Query Stream] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

