/**
 * POST /api/embed
 * Extract text from a PDF document, chunk it, and create embeddings using local Ollama
 */

import { NextRequest, NextResponse } from 'next/server';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { prisma } from '@/lib/db';
import { embedWithOllama, getOllamaModel } from '@/lib/ai';
import { chunkText } from '@/lib/chunk';
import { resolveFilePath } from '@/lib/storage';
import { extractTextFromPdf } from '@/lib/pdf';

// Explicitly use Node.js runtime for file system access
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { documentId } = body;

    // Validate documentId
    if (!documentId || typeof documentId !== 'number') {
      return NextResponse.json(
        { error: 'Valid documentId is required' },
        { status: 400 }
      );
    }

    // Check if document is already embedded (prevent duplicates)
    const existingChunks = await prisma.chunk.findFirst({
      where: { documentId },
    });

    if (existingChunks) {
      return NextResponse.json(
        { error: 'Document already embedded. To refresh later, implement a re-embed mode.' },
        { status: 409 }
      );
    }

    // Find the document in database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: `Document with id ${documentId} not found` },
        { status: 404 }
      );
    }

    // Resolve absolute path to the PDF file
    const filePath = resolveFilePath(document.originalPath);

    // Check if file path is valid
    if (!document.originalPath) {
      return NextResponse.json(
        { error: 'Document file path is missing' },
        { status: 404 }
      );
    }

    // Check if file exists
    try {
      await access(filePath, constants.R_OK);
    } catch (error) {
      console.error(`[Embed] File not accessible:`, error);
      return NextResponse.json(
        { error: 'PDF file not found or cannot be read' },
        { status: 404 }
      );
    }

    // Extract text from PDF
    let pdfText: string;
    try {
      const pdfData = await extractTextFromPdf(filePath);
      pdfText = pdfData.text;
    } catch (error) {
      console.error(`[Embed] Error parsing PDF:`, error);
      return NextResponse.json(
        { error: 'Failed to parse PDF file' },
        { status: 500 }
      );
    }

    // Check if text was extracted
    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No extractable text found. This PDF may be scanned images. Please use OCR or a text-based PDF.' },
        { status: 422 }
      );
    }

    // Chunk the text
    const chunks = chunkText(pdfText, 1500, 200);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No chunks could be created from the extracted text' },
        { status: 422 }
      );
    }

    // Insert all chunks into database
    const chunkRecords = await prisma.chunk.createMany({
      data: chunks.map((chunk) => ({
        documentId: documentId,
        chunkIndex: chunk.index,
        text: chunk.text,
        tokenCount: chunk.tokenCount,
      })),
    });

    // Retrieve the inserted chunks to get their IDs
    const insertedChunks = await prisma.chunk.findMany({
      where: { documentId: documentId },
      orderBy: { chunkIndex: 'asc' },
    });

    // Create embeddings for all chunks using local Ollama
    const modelName = getOllamaModel();
    
    // Extract chunk texts for embedding
    const chunkTexts = insertedChunks.map((c) => c.text);

    // Call Ollama embeddings
    let embeddingVectors: number[][];
    try {
      embeddingVectors = await embedWithOllama(chunkTexts);
    } catch (error: any) {
      console.error(`[Embed] Error generating embeddings:`, error);
      
      // Handle specific Ollama errors with helpful messages
      const errorMessage = error.message || 'Failed to generate embeddings';
      
      // Connection refused (Ollama not running)
      if (errorMessage.includes('Cannot connect to Ollama server') || 
          error.code === 'ECONNREFUSED' || 
          error.cause?.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { error: 'Cannot connect to Ollama server. Start: `ollama serve`' },
          { status: 503 }
        );
      }
      
      // Model not found
      if (errorMessage.includes('not found') || errorMessage.includes('Model')) {
        const modelName = getOllamaModel();
        return NextResponse.json(
          { error: `Ollama model "${modelName}" not found. Pull model: \`ollama pull ${modelName}\`` },
          { status: 404 }
        );
      }
      
      // Generic error
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // Verify we got the right number of embeddings
    if (embeddingVectors.length !== insertedChunks.length) {
      console.error(`[Embed] Embedding count mismatch: expected ${insertedChunks.length}, got ${embeddingVectors.length}`);
      return NextResponse.json(
        { error: 'Embedding count mismatch - please try again' },
        { status: 500 }
      );
    }

    // Insert all embeddings into database
    const embeddingRecords = await prisma.embedding.createMany({
      data: insertedChunks.map((chunk, index) => ({
        chunkId: chunk.id,
        vector: embeddingVectors[index],
        model: modelName,
      })),
    });

    // Return success response with counts
    return NextResponse.json({
      documentId: documentId,
      chunksCreated: chunkRecords.count,
      embeddingsCreated: embeddingRecords.count,
      model: modelName,
    });
  } catch (error) {
    console.error('[Embed] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during embedding' },
      { status: 500 }
      );
  }
}
