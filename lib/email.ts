import type { Transporter } from 'nodemailer';

export type EmailConfig = {
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

export class MailError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function ensureEmailConfig(): EmailConfig {
  const provider = process.env.MAIL_PROVIDER;
  const host = process.env.MAIL_HOST;
  const portRaw = process.env.MAIL_PORT;
  const secureRaw = process.env.MAIL_SECURE;
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;
  const fromName = process.env.MAIL_FROM_NAME;
  const fromEmail = process.env.MAIL_FROM_EMAIL;
  const replyTo = process.env.MAIL_REPLY_TO;

  if (!provider || !host || !portRaw || !secureRaw || !user || !pass || !fromEmail) {
    throw new MailError('MAIL_NOT_CONFIGURED', 'Mail configuration is missing');
  }

  const port = Number(portRaw);
  const secure = secureRaw === 'true';

  return {
    provider,
    host,
    port,
    secure,
    user,
    fromName: fromName ?? '',
    fromEmail,
    replyTo: replyTo ?? fromEmail
  };
}

export interface EmailProvider {
  sendMail(payload: { to: string; subject: string; text: string }): Promise<void>;
}

export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  private async getTransporter() {
    if (!this.transporter) {
      const { default: nodemailer } = await import('nodemailer');
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: process.env.MAIL_PASS
        }
      });
    }
    return this.transporter;
  }

  async sendMail(payload: { to: string; subject: string; text: string }) {
    const transporter = await this.getTransporter();
    const info = await transporter.sendMail({
      from: `"${this.config.fromName || '4runners'}" <${this.config.fromEmail}>`,
      to: payload.to,
      replyTo: this.config.replyTo,
      subject: payload.subject,
      text: payload.text
    });

    console.info('Email sent', {
      provider: this.config.provider,
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      from: this.config.fromEmail,
      to: payload.to,
      messageId: info.messageId
    });
  }
}

export function getEmailDomain(fromEmail: string | undefined): string | null {
  if (!fromEmail) return null;
  const parts = fromEmail.split('@');
  return parts.length === 2 ? parts[1] : null;
}
