import { prisma } from '@/lib/db';

export type SocialSettingsPayload = {
  instagram_handle?: string | null;
  facebook_page?: string | null;
  linkedin_page?: string | null;
  note?: string | null;
};

export function normalizeHandle(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function getSocialSettings(spaceId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: spaceId },
    select: { socialSettings: true }
  });

  const settings = (tenant?.socialSettings ?? {}) as SocialSettingsPayload;

  return {
    instagram_handle: settings.instagram_handle ?? null,
    facebook_page: settings.facebook_page ?? null,
    linkedin_page: settings.linkedin_page ?? null,
    note: settings.note ?? null
  };
}

export async function updateSocialSettings(
  spaceId: string,
  payload: SocialSettingsPayload
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: spaceId },
    select: { socialSettings: true }
  });

  const current = (tenant?.socialSettings ?? {}) as SocialSettingsPayload;

  const next = {
    ...current,
    ...payload
  };

  await prisma.tenant.update({
    where: { id: spaceId },
    data: {
      socialSettings: next
    }
  });

  return next;
}
