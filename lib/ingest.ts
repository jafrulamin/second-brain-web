/**
 * Document ingestion and embedding utilities
 * Extracts PDF text, chunks it, and creates embeddings
 */

import { access } from 'fs/promises';
import { constants } from 'fs';
import { prisma } from '@/lib/db';
import { embedTexts, getEmbedModelName } from '@/lib/ai_providers';
import { chunkText } from '@/lib/chunk';
import { resolveFilePath } from '@/lib/storage';
import { extractTextFromPdf } from '@/lib/pdf';

export interface EmbedResult {
  chunksCreated: number;
  embeddingsCreated: number;
  model: string;
}

/**
 * Embed a document: extract text, chunk, and create embeddings
 * @throws Error with specific messages for different failure modes
 */
export async function embedDocument(documentId: number): Promise<EmbedResult> {
  // Check if document is already embedded (prevent duplicates)
  const existingChunks = await prisma.chunk.findFirst({
    where: { documentId },
  });

  if (existingChunks) {
    throw new Error('Document already embedded. To refresh later, implement a re-embed mode.');
  }

  // Find the document in database
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error(`Document with id ${documentId} not found`);
  }

  // Resolve absolute path to the PDF file
  const filePath = resolveFilePath(document.originalPath);

  // Check if file path is valid
  if (!document.originalPath) {
    throw new Error('Document file path is missing');
  }

  // Check if file exists
  try {
    await access(filePath, constants.R_OK);
  } catch (error) {
    console.error(`[Ingest] File not accessible:`, error);
    throw new Error('PDF file not found or cannot be read');
  }

  // Extract text from PDF
  let pdfText: string;
  try {
    const pdfData = await extractTextFromPdf(filePath);
    pdfText = pdfData.text;
  } catch (error) {
    console.error(`[Ingest] Error parsing PDF:`, error);
    throw new Error('Failed to parse PDF file');
  }

  // Check if text was extracted
  if (!pdfText || pdfText.trim().length === 0) {
    throw new Error(
      'No extractable text found. This PDF may be scanned images. Please use OCR or a text-based PDF.'
    );
  }

  // Chunk the text
  const chunks = chunkText(pdfText, 1500, 200);

  if (chunks.length === 0) {
    throw new Error('No chunks could be created from the extracted text');
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

  // Create embeddings for all chunks using configured provider
  const modelName = getEmbedModelName();

  // Extract chunk texts for embedding
  const chunkTexts = insertedChunks.map((c) => c.text);

  // Call embedding provider
  let embeddingVectors: number[][];
  try {
    embeddingVectors = await embedTexts(chunkTexts);
  } catch (error: any) {
    console.error(`[Ingest] Error generating embeddings:`, error);

    // Handle specific errors with helpful messages
    const errorMessage = error.message || 'Failed to generate embeddings';

    // Connection refused (Ollama not running)
    if (
      errorMessage.includes('Cannot connect to Ollama server') ||
      error.code === 'ECONNREFUSED' ||
      error.cause?.code === 'ECONNREFUSED'
    ) {
      throw new Error('Cannot connect to Ollama server. Start: `ollama serve`');
    }

    // Model not found
    if (errorMessage.includes('not found') || errorMessage.includes('Model')) {
      throw new Error(
        `Embedding model "${modelName}" not found or not configured properly.`
      );
    }

    // Generic error
    throw new Error(errorMessage);
  }

  // Verify we got the right number of embeddings
  if (embeddingVectors.length !== insertedChunks.length) {
    console.error(
      `[Ingest] Embedding count mismatch: expected ${insertedChunks.length}, got ${embeddingVectors.length}`
    );
    throw new Error('Embedding count mismatch - please try again');
  }

  // Insert all embeddings into database
  const embeddingRecords = await prisma.embedding.createMany({
    data: insertedChunks.map((chunk, index) => ({
      chunkId: chunk.id,
      vector: embeddingVectors[index],
      model: modelName,
    })),
  });

  // Return success result
  return {
    chunksCreated: chunkRecords.count,
    embeddingsCreated: embeddingRecords.count,
    model: modelName,
  };
}

