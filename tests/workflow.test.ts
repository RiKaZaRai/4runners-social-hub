import { describe, expect, it } from 'vitest';
import { buildIdempotencyKey, canSchedule, canTransition } from '@/lib/workflow';

describe('workflow rules', () => {
  it('enforces valid transitions', () => {
    expect(canTransition('draft', 'pending_client')).toBe(true);
    expect(canTransition('draft', 'approved')).toBe(false);
    expect(canTransition('approved', 'scheduled')).toBe(true);
  });

  it('requires approved + future date to schedule', () => {
    expect(canSchedule('draft', new Date(Date.now() + 1000))).toBe(false);
    expect(canSchedule('approved', null)).toBe(false);
    expect(canSchedule('approved', new Date(Date.now() + 1000))).toBe(true);
  });

  it('generates deterministic idempotency keys', () => {
    const a = buildIdempotencyKey({
      postId: 'post-1',
      channelId: 'channel-1',
      scheduledAt: new Date('2030-01-01T00:00:00.000Z')
    });
    const b = buildIdempotencyKey({
      postId: 'post-1',
      channelId: 'channel-1',
      scheduledAt: new Date('2030-01-01T00:00:00.000Z')
    });
    expect(a).toBe(b);
  });
});
