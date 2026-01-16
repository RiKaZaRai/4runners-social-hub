import { describe, expect, it, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthenticatedRequest, requireAgency, requireTenantAccess } from '@/lib/api-auth';
import { processSendForApproval } from '@/app/api/spaces/[spaceId]/social/posts/[postId]/send-for-approval/route';
import { processApprovePost } from '@/app/api/spaces/[spaceId]/social/posts/[postId]/approve/route';
import { processRequestChanges } from '@/app/api/spaces/[spaceId]/social/posts/[postId]/request-changes/route';

vi.mock('@/lib/db', () => {
  const post = {
    findFirst: vi.fn(),
    update: vi.fn()
  };
  const comment = {
    create: vi.fn()
  };
  return {
    prisma: {
      post,
      comment
    }
  };
});

const mockPostFind = vi.mocked(prisma.post.findFirst);
const mockPostUpdate = vi.mocked(prisma.post.update);
const mockCommentCreate = vi.mocked(prisma.comment.create);

const getEnsureModuleEnabledMock = () => {
  const mock = (globalThis as any).__mockEnsureModuleEnabled;
  if (!mock) {
    throw new Error('Ensure module mock missing');
  }
  return mock as ReturnType<typeof vi.fn>;
};
const getCreateInboxItemMock = () => {
  const mock = (globalThis as any).__mockCreateInboxItem;
  if (!mock) {
    throw new Error('Inbox mock missing');
  }
  return mock as ReturnType<typeof vi.fn>;
};

vi.mock('@/lib/modules.server', () => {
  const ensure = vi.fn();
  (globalThis as any).__mockEnsureModuleEnabled = ensure;
  return {
    ensureModuleEnabled: ensure
  };
});

vi.mock('@/lib/inbox', () => {
  const create = vi.fn();
  (globalThis as any).__mockCreateInboxItem = create;
  return {
    createInboxItem: create
  };
});

vi.mock('@/lib/api-auth', () => ({
  requireTenantAccess: vi.fn(),
  requireAgency: vi.fn(),
  handleApiError: vi.fn()
}));

const mockRequireTenantAccess = vi.mocked(requireTenantAccess);
const mockRequireAgency = vi.mocked(requireAgency);

describe('social workflow helpers', () => {
  const baseAuth: AuthenticatedRequest = {
    userId: 'user-1',
    role: 'agency_admin',
    tenantIds: ['space-1'],
    session: { id: 's', token: 't', userId: 'user-1', expiresAt: new Date() }
  };

  beforeEach(() => {
    mockPostFind.mockReset();
    mockPostUpdate.mockReset();
    mockCommentCreate.mockReset();
    getEnsureModuleEnabledMock().mockReset().mockResolvedValue(true);
    getCreateInboxItemMock().mockReset();
    mockRequireTenantAccess.mockReset();
    mockRequireAgency.mockReset().mockImplementation(() => undefined);
  });

  it('blocks clients from sending a post for approval', async () => {
    mockRequireAgency.mockImplementation(() => {
      throw new Error('FORBIDDEN');
    });
    await expect(
      processSendForApproval({
        auth: { ...baseAuth, role: 'client_user' },
        spaceId: 'space-1',
        postId: 'post-1'
      })
    ).rejects.toThrow('FORBIDDEN');
  });

  it('throws when module is disabled for approval', async () => {
    getEnsureModuleEnabledMock().mockRejectedValue(new Error('MODULE_DISABLED'));
    await expect(
      processApprovePost({
        auth: { ...baseAuth, role: 'client_user' },
        spaceId: 'space-1',
        postId: 'post-1'
      })
    ).rejects.toThrow('MODULE_DISABLED');
  });

  it('prevents clients from approving non-pending posts', async () => {
    getEnsureModuleEnabledMock().mockResolvedValue(true);
    mockPostFind.mockResolvedValue({ id: 'post-1', status: 'draft', title: 'Test' });
    await expect(
      processApprovePost({
        auth: { ...baseAuth, role: 'client_user' },
        spaceId: 'space-1',
        postId: 'post-1'
      })
    ).rejects.toThrow('INVALID_TRANSITION');
  });

  it('creates inbox entries when sending for approval', async () => {
    mockPostFind.mockResolvedValue({
      id: 'post-1',
      title: 'Un post',
      body: 'Contenu',
      status: 'draft'
    });
    mockPostUpdate.mockResolvedValue({ id: 'post-1', status: 'pending_client' });

    const result = await processSendForApproval({
      auth: baseAuth,
      spaceId: 'space-1',
      postId: 'post-1'
    });

    expect(result.status).toBe('pending_client');
    expect(getCreateInboxItemMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKey: 'post_validation:space-1:post-1',
        type: 'validation'
      })
    );
  });

  it('adds comments and inbox items when requesting changes', async () => {
    getEnsureModuleEnabledMock().mockResolvedValue(true);
    mockPostFind.mockResolvedValue({
      id: 'post-1',
      title: 'Post PB',
      status: 'pending_client'
    });
    mockCommentCreate.mockResolvedValue({ id: 'c-1', body: 'Fix pls' });

    const result = await processRequestChanges({
      auth: { ...baseAuth, role: 'client_user' },
      spaceId: 'space-1',
      postId: 'post-1',
      payload: { comment: 'Fix pls' }
    });

    expect(result.comment.id).toBe('c-1');
    expect(getCreateInboxItemMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'message',
        entityKey: 'post_thread:space-1:post-1'
      })
    );
  });
});
