import type { Role, SpaceInvite } from '@prisma/client';
import { isAgencyAdmin, isAgencyManager } from '@/lib/roles';

export const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type InviteTimestamp = string | Date | null;

export function isInviteExpired(
  invite: { expiresAt: InviteTimestamp; acceptedAt: InviteTimestamp },
  now = new Date()
) {
  if (invite.acceptedAt) {
    return true;
  }
  const expiresValue = invite.expiresAt ?? now;
  const expiresAt =
    typeof expiresValue === 'string' || typeof expiresValue === 'number'
      ? new Date(expiresValue)
      : expiresValue instanceof Date
      ? new Date(expiresValue)
      : now;
  return expiresAt.getTime() <= now.getTime();
}

export function canManageSpace(role: Role | null | undefined, hasMembership: boolean) {
  if (isAgencyAdmin(role)) {
    return true;
  }
  if (isAgencyManager(role) && hasMembership) {
    return true;
  }
  return false;
}
