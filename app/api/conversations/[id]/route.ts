/**
 * GET /api/conversations/[id] - Get conversation messages
 * DELETE /api/conversations/[id] - Delete conversation with cascade
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import { resolveFilePath } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id, 10);

    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }

    // Fetch conversation with messages and their sources
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sources: true,
          },
        },
      },
    });

    if (!conversation) {
      console.log('[API GET /conversations/:id] Conversation not found:', conversationId);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    console.log('[API GET /conversations/:id] Found conversation:', conversationId, 'with', conversation.messages.length, 'messages');
    
    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        sources: msg.sources,
      })),
    });
  } catch (error) {
    console.error('[Conversations] Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id, 10);

    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }

    // Fetch all documents for this conversation to get file paths
    const documents = await prisma.document.findMany({
      where: { conversationId },
      select: { id: true, originalPath: true },
    });

    const filePaths = documents.map((doc) => doc.originalPath);
    const documentIds = documents.map((doc) => doc.id);

    // Step 1: Delete the conversation (cascades to messages and message sources)
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    // At this point, the conversation is deleted from the DB
    // Any subsequent errors in cleanup should not fail the request
    
    // Step 2: Manually delete embeddings, chunks, and documents
    // (SQLite onDelete: SetNull for documents means we need manual cleanup)
    let docsRemoved = 0;
    if (documentIds.length > 0) {
      try {
        // Delete embeddings for chunks of these documents
        await prisma.embedding.deleteMany({
          where: {
            chunk: {
              documentId: { in: documentIds },
            },
          },
        });

        // Delete chunks for these documents
        await prisma.chunk.deleteMany({
          where: {
            documentId: { in: documentIds },
          },
        });

        // Delete the documents themselves
        await prisma.document.deleteMany({
          where: {
            id: { in: documentIds },
          },
        });
        
        docsRemoved = documentIds.length;
      } catch (cleanupError) {
        console.error('[Delete] Error during document/chunk cleanup (non-fatal):', cleanupError);
      }
    }

    // Step 3: Remove physical files from disk
    // Note: File cleanup errors are logged but don't fail the request
    let filesRemoved = 0;
    for (const filePath of filePaths) {
      if (!filePath) continue;

      try {
        const absolutePath = resolveFilePath(filePath);
        
        // Safety check: ensure the file is in the uploads directory
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        const resolvedUploadDir = resolveFilePath(uploadDir);
        
        if (!absolutePath.startsWith(resolvedUploadDir)) {
          console.warn(`[Delete] Skipping file outside upload dir: ${absolutePath}`);
          continue;
        }

        await unlink(absolutePath);
        filesRemoved++;
      } catch (error: any) {
        // Log file cleanup errors but don't fail the request
        if (error.code !== 'ENOENT') {
          console.error(`[Delete] Failed to delete file ${filePath}:`, error);
        }
      }
    }

    console.log(`[Delete] Successfully deleted conversation ${conversationId}, removed ${filesRemoved} files and ${docsRemoved} documents`);
    
    return NextResponse.json({
      deleted: true,
      filesRemoved,
      docsRemoved,
    });
  } catch (error: any) {
    console.error('[Conversations] Error deleting conversation:', error);
    
    // Handle case where conversation doesn't exist
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

