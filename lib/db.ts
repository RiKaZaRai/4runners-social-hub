import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const fallbackDatabaseUrl = 'postgresql://postgres:postgres@localhost:5432/fourunners';
const connectionString = process.env.DATABASE_URL ?? fallbackDatabaseUrl;
const allowFallback = process.env.PRISMA_ALLOW_FALLBACK === 'true';

if (!process.env.DATABASE_URL && !allowFallback) {
  throw new Error('DATABASE_URL must be set to initialize Prisma');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString
    }),
    log: ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
