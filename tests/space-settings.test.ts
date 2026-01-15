import { describe, expect, it, vi, beforeEach } from 'vitest';
import { processSpaceSettingsPayload } from '@/app/api/spaces/[spaceId]/settings/route';
import type { AuthenticatedRequest } from '@/lib/api-auth';
import { setModule, getSpaceModules } from '@/lib/modules';
import * as spaceSettings from '@/lib/space-settings';

vi.mock('@/lib/api-auth', () => ({
  requireAuth: vi.fn(),
  requireTenantAccess: vi.fn(),
  handleApiError: vi.fn()
}));

vi.mock('@/lib/modules', () => ({
  AVAILABLE_SPACE_MODULES: ['messages', 'social', 'docs', 'projects', 'planning'],
  setModule: vi.fn(),
  getSpaceModules: vi.fn()
}));

vi.mock('@/lib/space-settings', () => ({
  updateSocialSettings: vi.fn(),
  getSocialSettings: vi.fn(),
  normalizeHandle: (value: string | null | undefined) => (value ? value.trim() : null)
}));

const mockSetModule = vi.mocked(setModule);
const mockGetSpaceModules = vi.mocked(getSpaceModules);
const mockUpdateSocialSettings = vi.mocked(spaceSettings.updateSocialSettings);
const mockGetSocialSettings = vi.mocked(spaceSettings.getSocialSettings);

describe('space settings handler', () => {
  const baseAuth: AuthenticatedRequest = {
    userId: 'user-1',
    role: 'agency_admin',
    tenantIds: ['space-1'],
    session: { id: 's', token: 't', userId: 'user-1', expiresAt: new Date() }
  };

  beforeEach(() => {
    mockGetSpaceModules.mockResolvedValue(['social']);
    mockUpdateSocialSettings.mockResolvedValue({});
    mockGetSocialSettings.mockResolvedValue({
      instagram_handle: 'insta',
      facebook_page: null,
      linkedin_page: null,
      note: null
    });
    mockSetModule.mockReset();
    mockGetSpaceModules.mockReset();
  });

  it('throws FORBIDDEN when user is not agency admin/manager', async () => {
    await expect(
      processSpaceSettingsPayload({
        auth: { ...baseAuth, role: 'client_user' },
        spaceId: 'space-1',
        payload: {}
      })
    ).rejects.toThrow('FORBIDDEN');
  });

  it('updates modules and social settings when admin', async () => {
    mockGetSpaceModules.mockResolvedValue(['social']);

    const result = await processSpaceSettingsPayload({
      auth: baseAuth,
      spaceId: 'space-1',
      payload: {
        modules: { social: true },
        socialSettings: { instagram_handle: '  handle ', note: 'test' }
      }
    });

    expect(mockSetModule).toHaveBeenCalledWith('space-1', 'social', true);
    expect(mockGetSpaceModules).toHaveBeenCalledWith('space-1');
    expect(mockUpdateSocialSettings).toHaveBeenCalledWith('space-1', {
      instagram_handle: 'handle',
      facebook_page: null,
      linkedin_page: null,
      note: 'test'
    });
    expect(result.socialSettings.instagram_handle).toBe('insta');
  });
});
