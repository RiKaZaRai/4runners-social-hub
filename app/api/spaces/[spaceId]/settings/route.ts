import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, requireTenantAccess, handleApiError } from '@/lib/api-auth';
import { isAgencyAdmin, isAgencyManager } from '@/lib/roles';
import { AVAILABLE_SPACE_MODULES, setModule, getSpaceModules } from '@/lib/modules';
import { getSocialSettings, updateSocialSettings, normalizeHandle } from '@/lib/space-settings';

const moduleSchema = z.record(
  z.enum(AVAILABLE_SPACE_MODULES),
  z.boolean()
);

const socialSchema = z.object({
  instagram_handle: z.string().optional().nullable(),
  facebook_page: z.string().optional().nullable(),
  linkedin_page: z.string().optional().nullable(),
  note: z.string().optional().nullable()
});

const settingsSchema = z.object({
  modules: moduleSchema.optional(),
  socialSettings: socialSchema.optional()
});

async function handleGET(auth: Awaited<ReturnType<typeof requireAuth>>, spaceId: string) {
  requireTenantAccess(auth, spaceId);
  const modules = await getSpaceModules(spaceId);
  const socialSettings = await getSocialSettings(spaceId);
  return NextResponse.json({ modules, socialSettings });
}

export async function processSpaceSettingsPayload({
  auth,
  spaceId,
  payload
}: {
  auth: Awaited<ReturnType<typeof requireAuth>>;
  spaceId: string;
  payload: z.infer<typeof settingsSchema>;
}) {
  requireTenantAccess(auth, spaceId);

  if (!isAgencyAdmin(auth.role) && !isAgencyManager(auth.role)) {
    throw new Error('FORBIDDEN');
  }

  if (payload.modules) {
    for (const [moduleName, enabled] of Object.entries(payload.modules)) {
      await setModule(spaceId, moduleName as typeof AVAILABLE_SPACE_MODULES[number], enabled);
    }
  }

  if (payload.socialSettings) {
    await updateSocialSettings(spaceId, {
      instagram_handle: normalizeHandle(payload.socialSettings.instagram_handle),
      facebook_page: normalizeHandle(payload.socialSettings.facebook_page),
      linkedin_page: normalizeHandle(payload.socialSettings.linkedin_page),
      note: payload.socialSettings.note?.trim() ?? null
    });
  }

  const modules = await getSpaceModules(spaceId);
  const socialSettings = await getSocialSettings(spaceId);
  return { modules, socialSettings };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    const auth = await requireAuth();
    const { spaceId } = await context.params;
    return await handleGET(auth, spaceId);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    const auth = await requireAuth();
    const payload = await req.json();
    const parsed = settingsSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('INVALID_INPUT');
    }
    const result = await processSpaceSettingsPayload({
      auth,
      spaceId: params.spaceId,
      payload: parsed.data
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
