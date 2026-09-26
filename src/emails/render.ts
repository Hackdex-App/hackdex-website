import fs from "node:fs/promises";
import path from "node:path";

import mjml from "mjml";
import type { MJMLParseError } from "mjml-core";

const EMAILS_DIR = path.join(process.cwd(), "src/emails");
const TEMPLATES_DIR = path.join(EMAILS_DIR, "templates");
const PARTIALS_DIR = path.join(EMAILS_DIR, "partials");

export type HackApprovedEmailVars = {
  title: string;
  slug: string;
};

export type HackReviewReplyEmailVars = {
  title: string;
  slug: string;
  message: string;
  adminName: string;
};

export type EmailTemplateVars = {
  announcement: { title: string; message: string };
  "hack-approved": HackApprovedEmailVars;
  "hack-review-reply": HackReviewReplyEmailVars;
};

export type EmailTemplate = keyof EmailTemplateVars;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function substituteVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined) {
      throw new Error(`Missing email template variable: ${key}`);
    }
    return value;
  });
}

// Announcement bodies are plain text. Preserve line breaks and link HTTP URLs.
function formatAnnouncementMessage(message: string): string {
  return message.split(/(https?:\/\/[^\s<>"']+)/g).map((part, index) => {
    if (index % 2 === 0) return escapeHtml(part);
    const url = part.replace(/[.,;!?)]+$/, "");
    return `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>${escapeHtml(part.slice(url.length))}`;
  }).join("").replace(/\r?\n/g, "<br />");
}

const templateNormalizers: {
  [K in EmailTemplate]: (vars: EmailTemplateVars[K]) => Record<string, string>;
} = {
  announcement: ({ title, message }) => ({
    title: escapeHtml(title),
    message: formatAnnouncementMessage(message),
  }),
  "hack-approved": ({ title, slug }) => ({
    title: escapeHtml(title),
    slug: encodeURIComponent(slug),
  }),
  "hack-review-reply": ({ title, slug, message, adminName }) => ({
    title: escapeHtml(title),
    slug: encodeURIComponent(slug),
    message: escapeHtml(message).replace(/\r?\n/g, "<br />"),
    adminName: escapeHtml(adminName),
  }),
};

function normalizeTemplateVars<T extends EmailTemplate>(
  template: T,
  vars: EmailTemplateVars[T],
): Record<string, string> {
  return templateNormalizers[template](vars);
}

async function loadTemplate(template: EmailTemplate): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, `${template}.mjml`);
  return fs.readFile(templatePath, "utf8");
}

export async function renderEmail<T extends EmailTemplate>(
  template: T,
  vars: EmailTemplateVars[T],
): Promise<string> {
  const mjmlSource = substituteVars(
    await loadTemplate(template),
    normalizeTemplateVars(template, vars),
  );

  const { html, errors } = await mjml(mjmlSource, {
    ignoreIncludes: false,
    filePath: TEMPLATES_DIR,
    includePath: PARTIALS_DIR,
    validationLevel: "soft",
  });

  const fatalErrors = errors.filter((error: MJMLParseError & { level?: "error" }) => error.level === "error");
  if (fatalErrors.length > 0) {
    const message = fatalErrors.map((error) => error.formattedMessage || error.message).join("\n");
    throw new Error(`Failed to render email template "${template}":\n${message}`);
  }

  return html;
}
