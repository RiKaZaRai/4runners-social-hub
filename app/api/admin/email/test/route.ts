import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/api-auth';
import { isAgencyAdmin } from '@/lib/roles';
import { ensureEmailConfig, EmailProvider, SmtpEmailProvider, MailError } from '@/lib/email';

const emailTestSchema = z.object({
  to: z.string().email()
});

export async function processEmailTest({
  auth,
  payload,
  options
}: {
  auth: Awaited<ReturnType<typeof requireAuth>>;
  payload: { to: string };
  options?: {
    rateLimit?: (identifier: string) => Promise<void>;
    providerFactory?: (config: ReturnType<typeof ensureEmailConfig>) => EmailProvider;
  };
}) {
  const { providerFactory } = options ?? {};

  if (!isAgencyAdmin(auth.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const parsed = emailTestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  let config;
  try {
    config = ensureEmailConfig();
  } catch (error) {
    if (error instanceof MailError && error.code === 'MAIL_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'MAIL_NOT_CONFIGURED' }, { status: 500 });
    }
    throw error;
  }

  const provider: EmailProvider = providerFactory ? providerFactory(config) : new SmtpEmailProvider(config);

  const timestamp = new Date().toISOString();
  await provider.sendMail({
    to: parsed.data.to,
    subject: '[Test] Configuration email OK',
    text: `La configuration SMTP a bien repondu le ${timestamp}.`
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const payload = await req.json();
    return await processEmailTest({ auth, payload });
  } catch (error) {
    return handleApiError(error);
  }
}
