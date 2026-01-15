import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { processEmailTest } from '@/app/api/admin/email/test/route';
import type { AuthenticatedRequest } from '@/lib/api-auth';
import type { Role } from '@prisma/client';

const authTemplate = (role: Role): AuthenticatedRequest => ({
  userId: 'user-id',
  role,
  tenantIds: [],
  session: {
    id: 'session-id',
    token: 'token',
    userId: 'user-id',
    expiresAt: new Date(Date.now() + 1000 * 60)
  }
});

const rateLimitNoop = async () => {};
const providerFactory = () => ({
  sendMail: async () => {}
});

const envKeys = [
  'MAIL_PROVIDER',
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_SECURE',
  'MAIL_USER',
  'MAIL_PASS',
  'MAIL_FROM_NAME',
  'MAIL_FROM_EMAIL',
  'MAIL_REPLY_TO'
] as const;

describe('email test route', () => {
  const backup: Record<typeof envKeys[number], string | undefined> = {
    MAIL_PROVIDER: process.env.MAIL_PROVIDER,
    MAIL_HOST: process.env.MAIL_HOST,
    MAIL_PORT: process.env.MAIL_PORT,
    MAIL_SECURE: process.env.MAIL_SECURE,
    MAIL_USER: process.env.MAIL_USER,
    MAIL_PASS: process.env.MAIL_PASS,
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,
    MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL,
    MAIL_REPLY_TO: process.env.MAIL_REPLY_TO
  };

  beforeEach(() => {
    process.env.MAIL_PROVIDER = 'smtp';
    process.env.MAIL_HOST = 'smtp.example.com';
    process.env.MAIL_PORT = '587';
    process.env.MAIL_SECURE = 'false';
    process.env.MAIL_USER = 'dummy';
    process.env.MAIL_PASS = 'password';
    process.env.MAIL_FROM_NAME = '4runners';
    process.env.MAIL_FROM_EMAIL = 'no-reply@example.com';
    process.env.MAIL_REPLY_TO = 'reply@example.com';
  });

  afterEach(() => {
    envKeys.forEach((key) => {
      if (backup[key]) {
        process.env[key] = backup[key];
      } else {
        delete process.env[key];
      }
    });
  });

  it('returns 403 for non-admin users', async () => {
    const auth = authTemplate('client_user');
    const response = await processEmailTest({
      auth,
      payload: { to: 'test@example.com' },
      options: { rateLimit: rateLimitNoop, providerFactory }
    });

    expect(response.status).toBe(403);
  });

  it('returns 400 for invalid email payload', async () => {
    const auth = authTemplate('agency_admin');
    const response = await processEmailTest({
      auth,
      payload: { to: 'invalid-email' },
      options: { rateLimit: rateLimitNoop, providerFactory }
    });

    expect(response.status).toBe(400);
  });

  it('returns MAIL_NOT_CONFIGURED when env missing', async () => {
    envKeys.forEach((key) => delete process.env[key]);
    const auth = authTemplate('agency_admin');
    const response = await processEmailTest({
      auth,
      payload: { to: 'test@example.com' },
      options: { rateLimit: rateLimitNoop, providerFactory }
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('MAIL_NOT_CONFIGURED');
  });
});
