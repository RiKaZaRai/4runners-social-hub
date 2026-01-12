import { z } from 'zod';

export const postStatusSchema = z.enum([
  'draft',
  'pending_client',
  'changes_requested',
  'approved',
  'scheduled',
  'published',
  'archived'
]);

export const createPostSchema = z.object({
  tenantId: z.string().uuid(),
  title: z.string().min(2),
  body: z.string().min(1),
  status: postStatusSchema.optional(),
  scheduledAt: z.string().datetime().optional()
});

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.string().uuid()
});

export const checklistSchema = z.object({
  postId: z.string().uuid(),
  label: z.string().min(1),
  checked: z.boolean().optional()
});

export const commentSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().min(1),
  authorRole: z.enum(['agency', 'client'])
});

export const ideaSchema = z.object({
  tenantId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional()
});

export const enqueueJobSchema = z.object({
  postId: z.string().uuid(),
  channelId: z.string().uuid()
});
