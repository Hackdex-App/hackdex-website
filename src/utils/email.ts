import nodemailer from "nodemailer";

export const createMailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT!),
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
};

// At least one of html or text must be provided
// If html is provided, text can optionally be provided as well

interface SendTransactionalEmailBase {
  to: string;
  subject: string;
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

  await transporter.sendMail({
    from: `Hackdex <${noreply}>`,
    to: args.to,
    subject: args.subject,
    html: "html" in args ? args.html : undefined,
    text: "text" in args ? args.text : undefined,
  });
};
