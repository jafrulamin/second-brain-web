/**
 * Prisma client singleton
 * Ensures only one instance exists in development (prevents connection pool exhaustion)
 */

import { PrismaClient } from '@prisma/client';

// Extend global type to include prisma property
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Use global.prisma in development to avoid creating multiple instances during hot reload
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// In development, store the client on global to reuse across hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

