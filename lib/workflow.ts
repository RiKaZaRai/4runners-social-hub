import crypto from 'crypto';

export type PostStatus =
  | 'draft'
  | 'pending_client'
  | 'changes_requested'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived';

const transitions: Record<PostStatus, PostStatus[]> = {
  draft: ['pending_client', 'archived'],
  pending_client: ['changes_requested', 'approved', 'archived'],
  changes_requested: ['pending_client', 'archived'],
  approved: ['scheduled', 'archived'],
  scheduled: ['published', 'archived'],
  published: ['archived'],
  archived: []
};

export function canTransition(from: PostStatus, to: PostStatus) {
  return transitions[from].includes(to);
}

export function canSchedule(status: PostStatus, scheduledAt?: Date | null) {
  if (status !== 'approved') return false;
  if (!scheduledAt) return false;
  return scheduledAt.getTime() > Date.now();
}

export function buildIdempotencyKey(input: {
  postId: string;
  channelId: string;
  scheduledAt?: Date | null;
}) {
  const raw = `${input.postId}:${input.channelId}:${input.scheduledAt?.toISOString() ?? 'none'}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
