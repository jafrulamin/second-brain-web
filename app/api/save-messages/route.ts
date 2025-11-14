/**
 * POST /api/save-messages
 * Manually save user and assistant messages (used when streaming is aborted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, conversationId } = body;

    // Validate inputs
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Valid question string is required' },
        { status: 400 }
      );
    }

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json(
        { error: 'Valid answer string is required' },
        { status: 400 }
      );
    }

    if (!conversationId || typeof conversationId !== 'number') {
      return NextResponse.json(
        { error: 'Valid conversationId is required' },
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
        content: answer,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    console.log('[Save Messages] Saved messages for conversation:', conversationId);

    return NextResponse.json({
      success: true,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
    });
  } catch (error: any) {
    console.error('[Save Messages] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save messages' },
      { status: 500 }
    );
  }
}

