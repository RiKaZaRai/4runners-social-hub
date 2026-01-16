import { Queue } from 'bullmq';

let publishQueue: Queue | null = null;
let deleteRemoteQueue: Queue | null = null;
let syncCommentsQueue: Queue | null = null;

function shouldSkipRedis() {
  return process.env.NEXT_PHASE === 'phase-production-build' || !process.env.REDIS_URL;
}

function getRedisUrl() {
  return process.env.REDIS_URL ?? 'redis://localhost:6379';
}

function getPublishQueue() {
  if (!publishQueue) {
    publishQueue = new Queue('publish', { connection: { url: getRedisUrl(), maxRetriesPerRequest: null, lazyConnect: true } });
  }
  return publishQueue;
}

function getDeleteRemoteQueue() {
  if (!deleteRemoteQueue) {
    deleteRemoteQueue = new Queue('delete_remote', { connection: { url: getRedisUrl(), maxRetriesPerRequest: null, lazyConnect: true } });
  }
  return deleteRemoteQueue;
}

function getSyncCommentsQueue() {
  if (!syncCommentsQueue) {
    syncCommentsQueue = new Queue('sync_comments', { connection: { url: getRedisUrl(), maxRetriesPerRequest: null, lazyConnect: true } });
  }
  return syncCommentsQueue;
}

export async function enqueuePublish(data: { postId: string; channelId: string; idempotencyKey: string; outboxJobId: string }) {
  if (shouldSkipRedis()) return null;
  return getPublishQueue().add('publish', data, { attempts: 5, backoff: { type: 'exponential', delay: 5000 } });
}

export async function enqueueDeleteRemote(data: { postChannelId: string; outboxJobId: string }) {
  if (shouldSkipRedis()) return null;
  return getDeleteRemoteQueue().add('delete_remote', data, { attempts: 5, backoff: { type: 'exponential', delay: 5000 } });
}

export async function enqueueSyncComments(data: { tenantId: string; outboxJobId: string }) {
  if (shouldSkipRedis()) return null;
  return getSyncCommentsQueue().add('sync_comments', data, { attempts: 3, backoff: { type: 'fixed', delay: 60000 } });
}
