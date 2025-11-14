/**
 * GET /api/conversations/[id]/documents - Get documents for a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    // Fetch documents for this conversation
    const documents = await prisma.document.findMany({
      where: { conversationId },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      count: documents.length,
      hasDocuments: documents.length > 0,
    });
  } catch (error) {
    console.error('[Documents] Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

