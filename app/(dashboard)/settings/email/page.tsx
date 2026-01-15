import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyAdmin } from '@/lib/roles';
import { EmailSettingsPanel, EmailStatus } from '@/components/email-settings';
import { getEmailDomain } from '@/lib/email';

export default async function EmailSettingsPage() {
  const session = await requireSession();

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser || !isAgencyAdmin(currentUser.role)) {
    redirect('/home');
  }

  const provider = process.env.MAIL_PROVIDER;
  const host = process.env.MAIL_HOST;
  const port = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined;
  const secure = process.env.MAIL_SECURE === 'true';
  const fromName = process.env.MAIL_FROM_NAME ?? '';
  const fromEmail = process.env.MAIL_FROM_EMAIL;
  const replyTo = process.env.MAIL_REPLY_TO ?? fromEmail;

  const status: EmailStatus = {
    provider,
    host,
    port,
    secure,
    fromName,
    fromEmail,
    replyTo,
    domain: getEmailDomain(fromEmail),
    configured: Boolean(provider && host && port && fromEmail)
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administration</p>
        <h2 className="text-2xl font-semibold">Email (SMTP)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vérifiez que votre configuration SMTP est prête et envoyez un email de test.
        </p>
      </div>

      <EmailSettingsPanel status={status} />
    </div>
  );
}
