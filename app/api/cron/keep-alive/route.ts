/**
 * Keep-alive endpoint to prevent Supabase from pausing
 * Call this endpoint every 6 days to keep database active
 * 
 * Set up Vercel Cron or external service to ping this endpoint
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Simple query to keep database active
    const count = await prisma.conversation.count();
    
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      conversationCount: count,
      message: 'Database is active',
    });
  } catch (error) {
    console.error('[Keep-Alive] Error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Database query failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

