declare module 'nodemailer' {
  export type TransportOptions = {
    host?: string;
    port?: number;
    secure?: boolean;
    name?: string;
    auth?: {
      user?: string;
      pass?: string;
    };
  };

  export type SendMailOptions = {
    from?: string;
    to?: string | string[];
    replyTo?: string;
    subject?: string;
    text?: string;
  };

  export interface SentMessageInfo {
    messageId?: string;
  }

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
  }

  export type Nodemailer = {
    createTransport(options: TransportOptions): Transporter;
  };

  const nodemailer: Nodemailer;
  export default nodemailer;
}
