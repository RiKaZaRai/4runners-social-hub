import { describe, expect, it } from 'vitest';
import { canManageSpace, isInviteExpired } from '@/lib/space-users';

describe('space users helpers', () => {
  it('lets agency admins manage any space', () => {
    expect(canManageSpace('agency_admin', false)).toBe(true);
  });

  it('requires agency managers to have a membership', () => {
    expect(canManageSpace('agency_manager', false)).toBe(false);
    expect(canManageSpace('agency_manager', true)).toBe(true);
  });

  it('denies access to other roles', () => {
    expect(canManageSpace('client_admin', true)).toBe(false);
    expect(canManageSpace('agency_production', true)).toBe(false);
  });

  it('flags invites as expired when the deadline passes or already accepted', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    expect(isInviteExpired({ expiresAt: future.toISOString(), acceptedAt: null })).toBe(false);

    const past = new Date(Date.now() - 1000);
    expect(isInviteExpired({ expiresAt: past.toISOString(), acceptedAt: null })).toBe(true);

    expect(isInviteExpired({ expiresAt: future.toISOString(), acceptedAt: new Date().toISOString() })).toBe(true);
  });
});
