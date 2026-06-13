import fs from "node:fs/promises";
import path from "node:path";

import mjml from "mjml";
import { MJMLParseError } from "mjml-core";

const EMAILS_DIR = path.join(process.cwd(), "src/emails");
const TEMPLATES_DIR = path.join(EMAILS_DIR, "templates");
const PARTIALS_DIR = path.join(EMAILS_DIR, "partials");

export type HackApprovedEmailVars = {
  title: string;
  slug: string;
};

export type EmailTemplateVars = {
  "hack-approved": HackApprovedEmailVars;
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

const templateNormalizers: {
  [K in EmailTemplate]: (vars: EmailTemplateVars[K]) => Record<string, string>;
} = {
  "hack-approved": ({ title, slug }) => ({
    title: escapeHtml(title),
    slug: encodeURIComponent(slug),
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
