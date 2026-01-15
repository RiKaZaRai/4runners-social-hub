import { describe, expect, it } from 'vitest';
import { validateInviteForAcceptance } from '@/lib/space-users';

describe('space invite acceptance', () => {
  it('allows a valid invite (simulates 200)', () => {
    const invite = {
      expiresAt: new Date(Date.now() + 1000 * 60),
      acceptedAt: null
    };
    const result = validateInviteForAcceptance(invite);
    expect(result).toBeNull();
  });

  it('rejects an expired invite (410)', () => {
    const invite = {
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null
    };
    const result = validateInviteForAcceptance(invite);
    expect(result).toEqual({ status: 410, error: 'Invitation expired' });
  });

  it('rejects an already accepted invite (409)', () => {
    const invite = {
      expiresAt: new Date(Date.now() + 1000 * 60),
      acceptedAt: new Date()
    };
    const result = validateInviteForAcceptance(invite);
    expect(result).toEqual({ status: 409, error: 'Invitation already accepted' });
  });
 
  it('rejects missing invite (404)', () => {
    const result = validateInviteForAcceptance(null);
    expect(result).toEqual({ status: 404, error: 'Invitation not found' });
  });
});
