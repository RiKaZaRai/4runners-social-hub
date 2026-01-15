import type { Role, SpaceInvite } from '@prisma/client';
import { isAgencyAdmin, isAgencyManager } from '@/lib/roles';

export const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isInviteExpired(invite: Pick<SpaceInvite, 'expiresAt' | 'acceptedAt'>, now = new Date()) {
  if (invite.acceptedAt) {
    return true;
  }
  return new Date(invite.expiresAt).getTime() <= now.getTime();
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
