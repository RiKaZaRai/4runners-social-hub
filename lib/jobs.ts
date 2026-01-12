import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

export const publishQueue = new Queue('publish', { connection: redis });
export const deleteRemoteQueue = new Queue('delete_remote', { connection: redis });
export const syncCommentsQueue = new Queue('sync_comments', { connection: redis });

export async function enqueuePublish(data: { postId: string; channelId: string; idempotencyKey: string; outboxJobId: string }) {
  return publishQueue.add('publish', data, { attempts: 5, backoff: { type: 'exponential', delay: 5000 } });
}

export async function enqueueDeleteRemote(data: { postChannelId: string; outboxJobId: string }) {
  return deleteRemoteQueue.add('delete_remote', data, { attempts: 5, backoff: { type: 'exponential', delay: 5000 } });
}

export async function enqueueSyncComments(data: { tenantId: string; outboxJobId: string }) {
  return syncCommentsQueue.add('sync_comments', data, { attempts: 3, backoff: { type: 'fixed', delay: 60000 } });
}
