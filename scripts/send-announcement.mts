import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail } from "../src/emails/render.ts";
import type { Database } from "../src/types/db.ts";

type Announcement = { id: string; title: string; message: string; ready: boolean };
type Recipient = { email: string; userIds: string[]; hacks: string[] };
type Message = { from: string; replyTo: string; subject: string; html: string; text: string };
type Mailer = Pick<Resend["emails"], "send">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} before running this mode.`);
  return value;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function readOptional(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function loadAnnouncement(file: string): Promise<Announcement> {
  const value: unknown = JSON.parse(await readFile(file, "utf8"));
  if (!isRecord(value) || typeof value.id !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.id) ||
    typeof value.title !== "string" || !value.title.trim() || /[\r\n]/.test(value.title) ||
    typeof value.ready !== "boolean") {
    throw new Error("Announcement needs an id in lowercase kebab-case, a title, and a ready boolean.");
  }
  if (value.message !== undefined && value.messageFile !== undefined) {
    throw new Error("Announcement needs either message or messageFile, not both.");
  }
  let message = value.message;
  if (value.messageFile !== undefined) {
    if (typeof value.messageFile !== "string" || !value.messageFile.trim()) {
      throw new Error("Announcement needs a nonempty messageFile path.");
    }
    message = await readFile(path.resolve(path.dirname(file), value.messageFile), "utf8");
  }
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("Announcement needs a nonempty message or messageFile containing text.");
  }
  return { id: value.id, title: value.title, message, ready: value.ready };
}

/** Read approved hacks or hacks with uploaded patches, including pending and unpublished entries. */
export async function collectRecipients(supabase: SupabaseClient<Database>): Promise<Recipient[]> {
  const creators = new Map<string, string[]>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("hacks")
      .select("slug,created_by,current_patch,patch_url,approved")
      .eq("is_archive", false).order("slug").range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Cannot load hacks: ${error.message}`);
    if (!data) throw new Error("No response when loading hacks.");
    for (const hack of data) {
      if (!hack.current_patch && !hack.patch_url && !hack.approved) continue;
      const hacks = creators.get(hack.created_by) ?? [];
      hacks.push(hack.slug);
      creators.set(hack.created_by, hacks);
    }
    if (data.length < pageSize) break;
  }

  const recipients = new Map<string, Recipient>();
  for (const [id, hacks] of creators) {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error) throw new Error(`Cannot load creator ${id}: ${error.message}`);
    const email = data.user?.email?.trim().toLowerCase();
    if (!isEmail(email)) throw new Error(`Creator ${id} has no valid account email. Resolve before preparing recipients.`);
    const recipient = recipients.get(email) ?? { email, userIds: [], hacks: [] };
    recipient.userIds.push(id);
    recipient.hacks.push(...hacks);
    recipients.set(email, recipient);
  }
  return [...recipients.values()].sort((a, b) => a.email.localeCompare(b.email));
}

async function loadRecipients(file: string): Promise<Recipient[]> {
  const text = await readOptional(file);
  if (!text) throw new Error("No recipient snapshot. Run --prepare and review recipients.json first.");
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || !Array.isArray(value.recipients)) throw new Error("Invalid recipient snapshot.");
  const recipients = value.recipients.map((row: unknown) => {
    if (!isRecord(row) || !isEmail(row.email) || !Array.isArray(row.userIds) || !row.userIds.length ||
      !row.userIds.every((id): id is string => typeof id === "string" && id.length > 0) ||
      !Array.isArray(row.hacks) || !row.hacks.every((slug): slug is string => typeof slug === "string")) {
      throw new Error("Invalid recipient in snapshot.");
    }
    return { email: row.email.toLowerCase(), userIds: row.userIds, hacks: row.hacks };
  });
  if (!recipients.length || new Set(recipients.map((row) => row.email)).size !== recipients.length) {
    throw new Error("Recipient snapshot is empty or has duplicate email addresses.");
  }
  return recipients;
}

/** Fail closed on uncertain delivery. Resolve a pending record in Resend before retrying. */
export async function sendAnnouncement({ announcement, message, recipients, directory, mailer, delayMs = 1000 }: {
  announcement: Announcement;
  message: Message;
  recipients: Recipient[];
  directory: string;
  mailer: Mailer;
  delayMs?: number;
}) {
  if (!announcement.ready || /\{\{[^}]+\}\}/.test(announcement.title + announcement.message)) {
    throw new Error("Announcement is a draft. Finalize the dates and copy, then set ready to true.");
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = path.join(directory, "send.lock");
  const lock = await open(lockPath, "wx", 0o600);
  try {
    // Freeze both message and audience on first send so retries cannot change either.
    const payloadPath = path.join(directory, "payload.json");
    const payload = JSON.stringify({ message, recipients });
    const previous = await readOptional(payloadPath);
    if (previous !== undefined && previous !== payload) {
      throw new Error("Message or recipients changed after sending began. Restore the original files before resuming.");
    }
    if (previous === undefined) await writeFile(payloadPath, payload, { flag: "wx", mode: 0o600 });

    let accepted = 0;
    let skipped = 0;
    for (const recipient of recipients) {
      const recipientKey = hash(recipient.email);
      const sentPath = path.join(directory, `${recipientKey}.sent.json`);
      if (await readOptional(sentPath) !== undefined) {
        skipped++;
        continue;
      }
      const pendingPath = path.join(directory, `${recipientKey}.pending.json`);
      if (await readOptional(pendingPath) !== undefined) {
        throw new Error(`Unresolved delivery for ${recipient.email}. Check its pending record and Resend before retrying.`);
      }
      const idempotencyKey = `announcement/${announcement.id}/${recipientKey}`;
      const record = { email: recipient.email, userIds: recipient.userIds, idempotencyKey, attemptedAt: new Date().toISOString() };
      await writeFile(pendingPath, JSON.stringify(record, null, 2), { flag: "wx", mode: 0o600 });
      await setTimeout(delayMs);
      const { data, error } = await mailer.send({ ...message, to: recipient.email }, { idempotencyKey });
      if (error || !data) throw new Error(`Resend did not confirm ${recipient.email}: ${error?.message ?? "missing email ID"}. Check the pending record before retrying.`);
      await writeFile(pendingPath, JSON.stringify({ ...record, emailId: data.id, acceptedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
      await rename(pendingPath, sentPath);
      accepted++;
      console.log(`Accepted ${accepted}: ${recipient.email} (${data.id})`);
    }
    return { accepted, skipped };
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

export async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    prepare: { type: "boolean" }, test: { type: "string" }, send: { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("Usage: npm run email:announcement -- <announcement.json> [--prepare | --test you@example.com | --send]\nDefault: render an offline preview. --prepare saves creator recipients. --test sends only to the specified address. --send uses the reviewed snapshot.");
    return;
  }
  if (positionals.length !== 1 || [values.prepare, values.test !== undefined, values.send].filter(Boolean).length > 1) {
    throw new Error("Provide one announcement JSON file and at most one mode. See --help.");
  }
  const announcement = await loadAnnouncement(positionals[0]);
  const directory = path.resolve(".local/announcements", announcement.id);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const html = await renderEmail("announcement", announcement);
  const text = `${announcement.title}\n\n${announcement.message}\n\nYou can reply to this email with questions.\n\nThe Hackdex Team`;
  await writeFile(path.join(directory, "preview.html"), html, { mode: 0o600 });
  await writeFile(path.join(directory, "preview.txt"), text, { mode: 0o600 });
  console.log(`Preview: ${path.join(directory, "preview.html")}${announcement.ready ? "" : " (DRAFT)"}`);
  const recipientPath = path.join(directory, "recipients.json");

  if (values.prepare) {
    const source = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabase = createClient<Database>(source, requiredEnv("SUPABASE_SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const recipients = await collectRecipients(supabase);
    if (!recipients.length) throw new Error("No eligible creators found. No snapshot written.");
    await writeFile(recipientPath, JSON.stringify({ source, preparedAt: new Date().toISOString(), recipients }, null, 2), { flag: "wx", mode: 0o600 });
    console.log(`Prepared ${recipients.length} recipients from ${source}. Review ${recipientPath} before sending.`);
    return;
  }
  if (!values.send && values.test === undefined) {
    const snapshot = await readOptional(recipientPath);
    console.log(snapshot ? `${(await loadRecipients(recipientPath)).length} recipients prepared. No email sent.` : "No recipients prepared. Use --prepare to query Supabase. No email sent.");
    return;
  }
  const from = requiredEnv("RESEND_FROM");
  const replyTo = requiredEnv("RESEND_REPLY_TO");
  if (!isEmail(replyTo)) throw new Error("RESEND_REPLY_TO must be one monitored email address.");
  const message = { from, replyTo, subject: announcement.title, html, text };
  const resend = new Resend(requiredEnv("RESEND_API_KEY"));
  if (values.test !== undefined) {
    if (!isEmail(values.test)) throw new Error("--test needs one email address.");
    const { data, error } = await resend.emails.send({ ...message, subject: `[TEST] ${message.subject}`, to: values.test }, {
      idempotencyKey: `announcement-test/${randomUUID()}`,
    });
    if (error || !data) throw new Error(`Test send failed: ${error?.message ?? "missing email ID"}`);
    console.log(`Test accepted for ${values.test}: ${data.id}. Creator recipients were not used.`);
    return;
  }
  const recipients = await loadRecipients(recipientPath);
  console.log(`Sending to ${recipients.length} recipients in the saved snapshot.`);
  const result = await sendAnnouncement({ announcement, message, recipients, directory, mailer: resend.emails });
  console.log(`Finished: ${result.accepted} accepted by Resend, ${result.skipped} previously accepted. Check delivery and bounces in Resend.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
