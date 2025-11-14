/**
 * GET /api/env
 * Returns public environment configuration (no secrets)
 * Used by client to detect demo mode and adjust UI accordingly
 */

import { NextResponse } from 'next/server';
import { cfg } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    demo: cfg.DEMO_MODE,
    nodeEnv: cfg.NODE_ENV,
  });
}

