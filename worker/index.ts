import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redis } from '@/lib/redis';

const prisma = new PrismaClient();

async function markStatus(
  outboxJobId: string,
  status: 'processing' | 'failed' | 'completed',
  lastError?: string
) {
  await prisma.outboxJob.update({
    where: { id: outboxJobId },
    data: {
      status,
      lastError: lastError ?? null,
      attempts: status === 'failed' ? { increment: 1 } : undefined
    }
  });
}

const publishWorker = new Worker(
  'publish',
  async (job) => {
    const { postId, channelId, idempotencyKey, outboxJobId } = job.data as {
      postId: string;
      channelId: string;
      idempotencyKey: string;
      outboxJobId: string;
    };

    try {
      await markStatus(outboxJobId, 'processing');

      await prisma.postChannel.update({
        where: { id: channelId },
        data: {
          idempotencyKey,
          remoteId: `remote-${channelId}`,
          remoteUrl: `https://social.local/post/${postId}`,
          lastError: null
        }
      });

      await markStatus(outboxJobId, 'completed');
    } catch (error) {
      await markStatus(outboxJobId, 'failed', (error as Error).message);
      throw error;
    }
  },
  { connection: redis }
);

const deleteWorker = new Worker(
  'delete_remote',
  async (job) => {
    const { postChannelId, outboxJobId } = job.data as {
      postChannelId: string;
      outboxJobId: string;
    };

    try {
      await markStatus(outboxJobId, 'processing');

      await prisma.postChannel.update({
        where: { id: postChannelId },
        data: {
          remoteId: null,
          remoteUrl: null,
          lastError: null
        }
      });

      await markStatus(outboxJobId, 'completed');
    } catch (error) {
      await markStatus(outboxJobId, 'failed', (error as Error).message);
      throw error;
    }
  },
  { connection: redis }
);

const syncWorker = new Worker(
  'sync_comments',
  async (job) => {
    const { outboxJobId } = job.data as { outboxJobId: string };

    try {
      await markStatus(outboxJobId, 'processing');
      await markStatus(outboxJobId, 'completed');
    } catch (error) {
      await markStatus(outboxJobId, 'failed', (error as Error).message);
      throw error;
    }
  },
  { connection: redis }
);

function shutdown() {
  Promise.all([publishWorker.close(), deleteWorker.close(), syncWorker.close(), prisma.$disconnect()])
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
