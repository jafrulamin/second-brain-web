/**
 * POST /api/upload
 * Accepts PDF file uploads, saves to disk, persists metadata to database, and auto-embeds
 */

import { NextRequest, NextResponse } from 'next/server';
import { savePdfToDisk } from '@/lib/storage';
import { prisma } from '@/lib/db';
import { MAX_UPLOAD_MB, ALLOWED_MIME } from '@/lib/constants';
import { embedDocument } from '@/lib/ingest';
import { isDemo } from '@/lib/config';

export async function POST(request: NextRequest) {
  // Block uploads in demo mode
  if (isDemo()) {
    return NextResponse.json(
      { error: 'Uploads disabled in demo mode. This is a read-only demonstration.' },
      { status: 403 }
    );
  }
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Get conversationId from FormData or query params
    const conversationIdStr = 
      formData.get('conversationId') as string | null ||
      request.nextUrl.searchParams.get('conversationId');
    
    const conversationId = conversationIdStr ? parseInt(conversationIdStr, 10) : null;

    // Require conversationId
    if (conversationId === null || isNaN(conversationId)) {
      return NextResponse.json(
        { error: 'conversationId required' },
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

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Only PDF files are allowed. Got: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size (convert MB to bytes)
    const maxSizeBytes = MAX_UPLOAD_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_UPLOAD_MB}MB` },
        { status: 400 }
      );
    }

    // Get upload directory from environment (default to ./uploads)
    const uploadDir = process.env.UPLOAD_DIR || './uploads';

    // Save file to disk
    const { savedPath, safeFilename, sizeBytes } = await savePdfToDisk(
      file,
      uploadDir
    );

    // Insert document record into database with conversationId
    const document = await prisma.document.create({
      data: {
        filename: safeFilename,
        originalPath: savedPath,
        sizeBytes: sizeBytes,
        conversationId: conversationId,
      },
    });

    // Auto-embed the document
    let embedResult;
    try {
      embedResult = await embedDocument(document.id);
    } catch (embedError: any) {
      console.error('[Upload] Auto-embed failed:', embedError);
      
      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (embedError.message?.includes('not found')) statusCode = 404;
      else if (embedError.message?.includes('No extractable text')) statusCode = 422;
      else if (embedError.message?.includes('Cannot connect to Ollama')) statusCode = 503;
      
      return NextResponse.json(
        {
          error: `File uploaded but embedding failed: ${embedError.message}`,
          documentId: document.id,
          filename: document.filename,
          autoEmbedded: false,
        },
        { status: statusCode }
      );
    }

    // Return success response with document metadata and embed result
    return NextResponse.json(
      {
        documentId: document.id,
        filename: document.filename,
        sizeBytes: document.sizeBytes,
        conversationId: document.conversationId,
        originalPath: document.originalPath,
        createdAt: document.createdAt.toISOString(),
        autoEmbedded: true,
        chunksCreated: embedResult.chunksCreated,
        embeddingsCreated: embedResult.embeddingsCreated,
        model: embedResult.model,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file. Please try again.' },
      { status: 500 }
    );
  }
}

