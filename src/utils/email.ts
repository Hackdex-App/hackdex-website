import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";

let transporter: Transporter | null = null;

const sanitizeEmailSubject = (subject: string) => {
  return subject
    .replace(/[\x00-\x1f\x7f]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Replace whitespace with spaces
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .trim(); // Remove leading and trailing whitespace
};

export const createMailTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }
  return transporter;
};

// At least one of html or text must be provided
// If html is provided, text can optionally be provided as well

interface SendTransactionalEmailBase {
  to: string;
  subject: string;
  replyTo?: string;
}

interface SendTransactionalEmailWithHtml extends SendTransactionalEmailBase {
  html: string;
  text?: string;
}

interface SendTransactionalEmailWithText extends SendTransactionalEmailBase {
  text: string;
}

export const sendTransactionalEmail = async (args: SendTransactionalEmailWithHtml | SendTransactionalEmailWithText) => {
  const noreply = process.env.EMAIL_NOREPLY!;
  const transporter = createMailTransporter();
  const sanitizedSubject = sanitizeEmailSubject(args.subject);

  await transporter.sendMail({
    from: `Hackdex <${noreply}>`,
    to: args.to,
    replyTo: args.replyTo,
    subject: sanitizedSubject,
    html: "html" in args ? args.html : undefined,
    text: "text" in args ? args.text : undefined,
  });
};
