/**
 * GET /api/conversations - List all conversations
 * POST /api/conversations - Create a new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const conversations = await prisma.conversation.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      take: limit,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[Conversations] Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = body.title || 'New chat';

    const conversation = await prisma.conversation.create({
      data: {
        title,
      },
    });

    return NextResponse.json(
      {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Conversations] Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

