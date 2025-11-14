/**
 * POST /api/query
 * RAG query endpoint: similarity search + LLM answer generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { embedWithOllama } from '@/lib/ollama';
import { rankByCosine } from '@/lib/similarity';
import { buildContext, buildPrompt } from '@/lib/rag';
import { generateWithOllama } from '@/lib/ollama';

// Explicitly use Node.js runtime for file system access
export const runtime = 'nodejs';

// Configuration from environment
const TOP_K = parseInt(process.env.TOP_K || '5', 10);
const MAX_CONTEXT_CHARS = parseInt(process.env.MAX_CONTEXT_CHARS || '3000', 10);
const OLLAMA_LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'llama3';
// Limit embeddings fetched to prevent memory issues (default: 1000)
const MAX_EMBEDDINGS_SEARCH = parseInt(process.env.MAX_EMBEDDINGS_SEARCH || '1000', 10);
// FTS5 prefilter limit: how many candidates to retrieve via BM25 before cosine (default: 200)
const PREFILTER_LIMIT = parseInt(process.env.PREFILTER_LIMIT || '200', 10);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { question, conversationId } = body;

    // Validate question
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid question string is required' },
        { status: 400 }
      );
    }

    // Validate conversationId
    if (!conversationId || typeof conversationId !== 'number') {
      return NextResponse.json(
        { error: 'No conversationId. Create a chat first.' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: `Conversation with id ${conversationId} not found` },
        { status: 404 }
      );
    }

    // Create question embedding
    const questionEmbeddings = await embedWithOllama([question]);
    if (questionEmbeddings.length === 0 || questionEmbeddings[0].length === 0) {
      return NextResponse.json(
        { error: 'Failed to create question embedding' },
        { status: 500 }
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
      console.log(`[Query] FTS5 found ${candidateChunkIds.length} candidates via BM25`);
    } catch (ftsError) {
      console.error('[Query] FTS5 prefilter failed, falling back to all chunks:', ftsError);
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
      return NextResponse.json(
        { error: 'No embedded content in this conversation yet. Upload some documents first.' },
        { status: 422 }
      );
    }
    
    console.log(`[Query] Processing ${embeddings.length} embeddings for cosine similarity`);

    // Build array for ranking (only parse vectors when needed)
    // Filter out invalid vectors early to save memory
    const vectorRows = embeddings
      .filter((emb) => {
        const vec = emb.vector as number[];
        return Array.isArray(vec) && vec.length > 0;
      })
      .map((emb) => ({
        id: emb.chunkId,
        vector: emb.vector as number[], // Parse JSON to number[]
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

    if (context.length === 0) {
      return NextResponse.json(
        { error: 'No context could be built from retrieved chunks' },
        { status: 422 }
      );
    }

    // Build prompt
    const prompt = buildPrompt(question, context);

    // Generate answer using Ollama LLM
    // Use a timeout to prevent hanging
    let answer: string;
    try {
      // Set a timeout for LLM generation (90 seconds - matches fetch timeout)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM generation timeout after 90 seconds')), 90000);
      });
      
      answer = await Promise.race([
        generateWithOllama(prompt),
        timeoutPromise,
      ]);
    } catch (error: any) {
      console.error(`[Query] Error generating answer:`, error);
      
      // Handle specific Ollama errors
      if (error.message.includes('Cannot connect to Ollama server')) {
        return NextResponse.json(
          { error: error.message },
          { status: 503 }
        );
      }
      
      if (error.message.includes('not found') || error.message.includes('Pull LLM model')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to generate answer' },
        { status: 500 }
      );
    }

    // Build sources with documentId and chunkId
    const sourcesWithDocId = sources.map((s) => {
      const matchedChunk = chosen.find(
        (c) => c.filename === s.filename && c.chunkIndex === s.chunkIndex
      );
      return {
        documentId: matchedChunk?.docId || 0,
        chunkId: matchedChunk?.id || 0, // 'id' field is the chunkId
        filename: s.filename,
        chunkIndex: s.chunkIndex,
      };
    });

    // Persist messages to database
    try {
      // Create user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversationId,
          role: 'user',
          content: question,
        },
      });
      console.log('[Query] Created user message:', userMessage.id);

      // Create assistant message
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: conversationId,
          role: 'assistant',
          content: answer.trim(),
        },
      });
      console.log('[Query] Created assistant message:', assistantMessage.id);

      // Create message sources
      const messageSources = await Promise.all(
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
      console.log('[Query] Created', messageSources.length, 'message sources');

      // Update conversation's updatedAt timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    } catch (dbError) {
      console.error('[Query] Error persisting messages to database:', dbError);
      // Continue anyway - the user still gets their answer
    }

    // Return success response
    return NextResponse.json({
      answer: answer.trim(),
      sources: sourcesWithDocId,
      used: {
        k: chosen.length,
        model: OLLAMA_LLM_MODEL,
      },
    });
  } catch (error: any) {
    console.error('[Query] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during query processing' },
      { status: 500 }
    );
  }
}

