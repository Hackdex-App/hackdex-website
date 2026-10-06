import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail } from "../src/emails/render.ts";
import type { Database } from "../src/types/db.ts";
import { collectRecipients, loadAnnouncement, main, sendAnnouncement } from "./send-announcement.mts";

const announcement = { id: "test-notice", title: "Creator notice", message: "Please review your credits.", ready: true };
const message = { from: "Hackdex <notice@example.com>", replyTo: "test@example.com", subject: announcement.title, html: "<p>Please review your credits.</p>", text: announcement.message };
const recipients = [{ email: "creator@example.com", userIds: ["00000000-0000-4000-8000-000000000001"], hacks: ["hack-one"] }];

async function temporaryDirectory(t: TestContext) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hackdex-announcement-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("announcement escapes content, preserves paragraphs, and links URLs", async () => {
  const html = await renderEmail("announcement", {
    title: '<img src=x onerror="alert(1)"> & news',
    message: 'Hello <script>alert(1)</script>\n\nRead https://www.hackdex.app/terms?a=1&b=2.\njavascript:alert(1)',
  });
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("<br /><br />"));
  assert.ok(html.includes('href="https://www.hackdex.app/terms?a=1&amp;b=2"'));
  assert.ok(html.includes("You can reply to this email"));
  assert.ok(!html.includes("Please do not reply"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
});

test("announcement renders section and question headings", async () => {
  const html = await renderEmail("announcement", {
    title: "Feature announcement",
    message: "Intro.\n\n## How it works\n\nFirst paragraph.\n\nSecond paragraph.\r\n\r\n### A question?\r\n\r\nAn answer.",
  });
  assert.match(html, /<h2\b[^>]*font-size:20px[^>]*>How it works<\/h2>/);
  assert.match(html, /<h3\b[^>]*font-weight:700[^>]*>A question\?<\/h3>/);
  assert.ok(html.includes("First paragraph.<br /><br />Second paragraph."));
  assert.doesNotMatch(html, /<br \/><h[23]|<\/h[23]><br \/>/);
  assert.ok(!html.includes("## "));
});

test("announcement heading text stays escaped", async () => {
  const html = await renderEmail("announcement", {
    title: "Feature announcement",
    message: '## <img src=x onerror="alert(1)"> & news\n\nRead https://www.hackdex.app/faq.',
  });
  assert.match(html, /<h2\b[^>]*>&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; news<\/h2>/);
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes('href="https://www.hackdex.app/faq"'));
});

test("announcement screenshots link to their full-size images", async () => {
  const html = await renderEmail("announcement", {
    title: "Feature announcement",
    message: '## Preview\n\n![Form & player preview](https://example.com/form.png?v=1&size=large)\n\n![Code disclosure](https://example.com/code%20disclosure.png)\n\nRead https://www.hackdex.app/faq.',
  });
  const screenshots = [...html.matchAll(/<a\b[^>]*href="(https:\/\/example\.com\/[^\"]+)"[^>]*>\s*(<img\b[^>]*>)\s*<\/a>/g)];
  assert.equal(screenshots.length, 2);
  assert.equal(screenshots[0][1], "https://example.com/form.png?v=1&amp;size=large");
  assert.match(screenshots[0][2], /alt="Form &amp; player preview"/);
  assert.match(screenshots[1][2], /alt="Code disclosure"/);
  for (const [, url, img] of screenshots) {
    assert.ok(img.includes(`src="${url}"`));
    assert.match(img, /width:100%/);
    assert.match(img, /height:auto/);
  }
  assert.ok(html.includes('href="https://www.hackdex.app/faq"'));
  assert.ok(!html.includes("![Form"));
  assert.ok(!html.includes("![Code"));
});

test("announcement screenshots cannot inject HTML through alt text", async () => {
  const html = await renderEmail("announcement", {
    title: "Feature announcement",
    message: '![Preview " onerror="alert(1) <script>](https://example.com/form.png)',
  });
  const image = html.match(/<img\b[^>]*src="https:\/\/example\.com\/form.png"[^>]*>/)?.[0];
  assert.ok(image);
  assert.ok(image.includes('alt="Preview &quot; onerror=&quot;alert(1) &lt;script&gt;"'));
  assert.ok(!image.includes(' onerror="'));
  assert.ok(!html.includes("<script>"));
});

test("announcement images reject non-HTTP sources", async () => {
  const html = await renderEmail("announcement", {
    title: "Feature announcement",
    message: '![Unsafe](javascript:alert(1))\n\n![Local](file:///tmp/private.png)\n\n![Data](data:image/png;base64,abc)\n\n<img src="https://example.com/raw.png">',
  });
  assert.ok(!html.includes('src="javascript:'));
  assert.ok(!html.includes('src="file:'));
  assert.ok(!html.includes('src="data:'));
  assert.ok(!html.includes('src="https://example.com/raw.png"'));
  assert.ok(html.includes("![Unsafe]"));
  assert.ok(html.includes("&lt;img"));
});

test("announcement files validate the campaign ID and required copy", async (t) => {
  const directory = await temporaryDirectory(t);
  const file = path.join(directory, "notice.json");
  await writeFile(file, JSON.stringify(announcement));
  assert.deepEqual(await loadAnnouncement(file), announcement);
  for (const invalid of [{ ...announcement, id: "../escape" }, { ...announcement, message: " " }, { ...announcement, title: "Subject\nBcc: someone" }]) {
    await writeFile(file, JSON.stringify(invalid));
    await assert.rejects(loadAnnouncement(file), /Announcement needs/);
  }
});

test("announcement loads Markdown relative to its JSON file", async (t) => {
  const directory = await temporaryDirectory(t);
  const file = path.join(directory, "notice.json");
  const { message, ...metadata } = announcement;
  const markdown = `## Creator notice\n\n${message}\n\n![Preview](https://example.com/preview.png)\n`;
  await mkdir(path.join(directory, "copy"));
  await writeFile(path.join(directory, "copy", "notice.md"), markdown);
  await writeFile(file, JSON.stringify({ ...metadata, messageFile: "copy/notice.md" }));
  assert.deepEqual(await loadAnnouncement(file), { ...announcement, message: markdown });
});

test("announcement rejects ambiguous or invalid message sources", async (t) => {
  const directory = await temporaryDirectory(t);
  const file = path.join(directory, "notice.json");
  const { message, ...metadata } = announcement;
  for (const source of [
    {}, { message, messageFile: "notice.md" }, { messageFile: " " },
    { messageFile: null }, { messageFile: 123 }, { message: null },
  ]) {
    await writeFile(file, JSON.stringify({ ...metadata, ...source }));
    await assert.rejects(loadAnnouncement(file), /Announcement needs/);
  }
});

test("announcement reports missing or empty Markdown files", async (t) => {
  const directory = await temporaryDirectory(t);
  const file = path.join(directory, "notice.json");
  const { message: _message, ...metadata } = announcement;
  await writeFile(file, JSON.stringify({ ...metadata, messageFile: "notice.md" }));
  await assert.rejects(loadAnnouncement(file), { code: "ENOENT" });
  await writeFile(path.join(directory, "notice.md"), " \n\t");
  await assert.rejects(loadAnnouncement(file), /Announcement needs/);
});

test("recipient selection paginates, excludes empty drafts, and deduplicates creator emails", async () => {
  const offsets: number[] = [];
  const authLookups: string[] = [];
  const supabase = createClient<Database>("https://test.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(new Request(input, init).url);
      if (url.pathname === "/rest/v1/hacks") {
        assert.equal(url.searchParams.get("is_archive"), "eq.false");
        assert.equal(url.searchParams.get("deleted_at"), "is.null");
        const columns = new Set(["slug", "created_by", "current_patch", "patch_url", "approved"]);
        const unknown = url.searchParams.get("select")?.split(",").find((column) => !columns.has(column));
        if (unknown) return Response.json({ message: `column hacks.${unknown} does not exist`, code: "42703" }, { status: 400 });
        const offset = Number(url.searchParams.get("offset") ?? 0);
        offsets.push(offset);
        const row = { created_by: "00000000-0000-4000-8000-000000000001", current_patch: 1, patch_url: "", approved: false };
        return Response.json(offset === 0
          ? Array.from({ length: 1000 }, (_, i) => ({ ...row, slug: `hack-${i}` }))
          : [
            { ...row, slug: "pending", created_by: "00000000-0000-4000-8000-000000000002", current_patch: 2 },
            { ...row, slug: "legacy", created_by: "00000000-0000-4000-8000-000000000003", current_patch: null, patch_url: "patch.bps" },
            { ...row, slug: "approved", created_by: "00000000-0000-4000-8000-000000000003", current_patch: null, approved: true },
            { ...row, slug: "empty-draft", created_by: "draft-owner", current_patch: null },
          ]);
      }
      const id = url.pathname.split("/").at(-1)!;
      authLookups.push(id);
      return Response.json({ id, email: id === "00000000-0000-4000-8000-000000000003" ? "second@example.com" : "Creator@Example.com", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
    } },
  });
  const result = await collectRecipients(supabase);
  assert.deepEqual(offsets, [0, 1000]);
  assert.deepEqual(authLookups, ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"]);
  assert.equal(result.length, 2);
  assert.equal(result[0].email, "creator@example.com");
  assert.deepEqual(result[0].userIds, ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"]);
  assert.equal(result[0].hacks.length, 1001);
  assert.deepEqual(result[1].hacks, ["legacy", "approved"]);
});

test("recipient preparation reports database failures instead of returning an empty audience", async () => {
  const supabase = createClient<Database>("https://test.supabase.co", "test-key", {
    auth: { persistSession: false },
    global: { fetch: async () => Response.json({ message: "Permission denied" }, { status: 403 }) },
  });
  await assert.rejects(collectRecipients(supabase), /Cannot load hacks: Permission denied/);
});

test("recipient preparation stops when an uploaded hack's creator has no email", async () => {
  const supabase = createClient<Database>("https://test.supabase.co", "test-key", {
    auth: { persistSession: false },
    global: { fetch: async (input, init) => {
      const url = new URL(new Request(input, init).url);
      return Response.json(url.pathname === "/rest/v1/hacks"
        ? [{ slug: "uploaded", created_by: "00000000-0000-4000-8000-000000000001", current_patch: 1, patch_url: "", approved: false }]
        : { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
    } },
  });
  await assert.rejects(collectRecipients(supabase), /has no valid account email/);
});

test("conflicting modes are rejected before any network request", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected network request"); });
  await assert.rejects(main(["notice.json", "--test", "preview@example.com", "--send"]), /at most one mode/);
});

test("default mode renders offline without querying recipients or sending email", async (t) => {
  const directory = await temporaryDirectory(t);
  const previousCwd = process.cwd();
  process.chdir(directory);
  t.after(() => process.chdir(previousCwd));
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected network request"); });
  const { message: _message, ...metadata } = announcement;
  await writeFile("notice.md", "## Details\n\nRead https://www.hackdex.app/faq.");
  await writeFile("notice.json", JSON.stringify({ ...metadata, messageFile: "notice.md", ready: false }));
  await main(["notice.json"]);
  const html = await readFile(".local/announcements/test-notice/preview.html", "utf8");
  assert.ok(html.includes("Creator notice"));
  assert.match(html, /<h2\b[^>]*>Details<\/h2>/);
  assert.ok((await readFile(".local/announcements/test-notice/preview.txt", "utf8")).includes("## Details\n\nRead https://www.hackdex.app/faq."));
  assert.deepEqual((await readdir(".local/announcements/test-notice")).sort(), ["preview.html", "preview.txt"]);
});

test("test mode sends only to its explicit address and never uses the creator snapshot", async (t) => {
  const directory = await temporaryDirectory(t);
  const previousCwd = process.cwd();
  process.chdir(directory);
  t.after(() => process.chdir(previousCwd));
  const env = { RESEND_FROM: message.from, RESEND_REPLY_TO: message.replyTo, RESEND_API_KEY: "re_test_key" };
  for (const [key, value] of Object.entries(env)) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
  let sent = 0;
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    assert.equal(input, "https://api.resend.com/emails");
    const body = JSON.parse(String(init.body));
    assert.equal(body.to, "preview@example.com");
    assert.equal(body.reply_to, "test@example.com");
    assert.equal(body.subject, "[TEST] Creator notice");
    assert.equal(body.cc, undefined);
    assert.equal(body.bcc, undefined);
    sent++;
    return Response.json({ id: "test-email" });
  });
  await writeFile("notice.json", JSON.stringify({ ...announcement, ready: false }));
  await mkdir(".local/announcements/test-notice", { recursive: true });
  await writeFile(".local/announcements/test-notice/recipients.json", "intentionally invalid snapshot");
  await main(["notice.json", "--test", "preview@example.com"]);
  assert.equal(sent, 1);
  assert.equal(await readFile(".local/announcements/test-notice/recipients.json", "utf8"), "intentionally invalid snapshot");
  assert.ok(!(await readdir(".local/announcements/test-notice")).includes("payload.json"));
});

test("production sending rejects drafts and unresolved placeholders", async (t) => {
  const directory = await temporaryDirectory(t);
  const mailer = new Resend("re_test_key").emails;
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected email"); });
  for (const draft of [{ ...announcement, ready: false }, { ...announcement, message: "Effective {{effectiveDate}}" }]) {
    await assert.rejects(sendAnnouncement({ announcement: draft, message, recipients, directory, mailer }), /Announcement is a draft/);
  }
  assert.deepEqual(await readdir(directory), []);
});

test("production sending rejects placeholders loaded from Markdown", async (t) => {
  const directory = await temporaryDirectory(t);
  const file = path.join(directory, "notice.json");
  const { message: _message, ...metadata } = announcement;
  await writeFile(path.join(directory, "notice.md"), "Effective {{effectiveDate}}");
  await writeFile(file, JSON.stringify({ ...metadata, messageFile: "notice.md" }));
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected email"); });
  await assert.rejects(sendAnnouncement({
    announcement: await loadAnnouncement(file), message, recipients,
    directory: path.join(directory, "delivery"), mailer: new Resend("re_test_key").emails,
  }), /Announcement is a draft/);
  assert.deepEqual((await readdir(directory)).sort(), ["notice.json", "notice.md"]);
});

test("accepted sends persist IDs and are skipped on subsequent runs", async (t) => {
  const directory = await temporaryDirectory(t);
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (_input: string, init: RequestInit) => {
    requests.push(new Headers(init.headers).get("Idempotency-Key")!);
    assert.equal(JSON.parse(String(init.body)).to, "creator@example.com");
    return Response.json({ id: "accepted-email" });
  });
  const options = { announcement, message, recipients, directory, mailer: new Resend("re_test_key").emails, delayMs: 0 };
  assert.deepEqual(await sendAnnouncement(options), { accepted: 1, skipped: 0 });
  assert.deepEqual(await sendAnnouncement(options), { accepted: 0, skipped: 1 });
  assert.equal(requests.length, 1);
  assert.match(requests[0], /^announcement\/test-notice\/[a-f0-9]{64}$/);
  const recordName = (await readdir(directory)).find((file) => file.endsWith(".sent.json"))!;
  const record = JSON.parse(await readFile(path.join(directory, recordName), "utf8"));
  assert.equal(record.emailId, "accepted-email");
  assert.equal(record.email, "creator@example.com");
  await assert.rejects(sendAnnouncement({ ...options, message: { ...message, subject: "Changed" } }), /Message or recipients changed/);
  assert.equal(requests.length, 1);
});

test("uncertain delivery stops the run and blocks blind resends", async (t) => {
  const directory = await temporaryDirectory(t);
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; throw new Error("Connection lost"); });
  const options = { announcement, message, recipients, directory, mailer: new Resend("re_test_key").emails, delayMs: 0 };
  await assert.rejects(sendAnnouncement(options), /Resend did not confirm/);
  await assert.rejects(sendAnnouncement(options), /Unresolved delivery/);
  assert.equal(requests, 1);
  const files = await readdir(directory);
  assert.equal(files.filter((file) => file.endsWith(".pending.json")).length, 1);
  assert.equal(files.filter((file) => file.endsWith(".sent.json")).length, 0);
  assert.ok(!files.includes("send.lock"));
});

test("concurrent sending cannot bypass the campaign lock", async (t) => {
  const directory = await temporaryDirectory(t);
  await writeFile(path.join(directory, "send.lock"), "another process owns this");
  await assert.rejects(sendAnnouncement({ announcement, message, recipients, directory, mailer: new Resend("re_test_key").emails }), /another send is running/);
  assert.equal(await readFile(path.join(directory, "send.lock"), "utf8"), "another process owns this");
  // A live owner's PID blocks too.
  await writeFile(path.join(directory, "send.lock"), String(process.pid));
  await assert.rejects(sendAnnouncement({ announcement, message, recipients, directory, mailer: new Resend("re_test_key").emails }), /another send is running/);
});

test("a lock left by a killed run is cleared", async (t) => {
  const directory = await temporaryDirectory(t);
  // Above Linux's PID ceiling, so no process has it.
  await writeFile(path.join(directory, "send.lock"), "99999999");
  t.mock.method(globalThis, "fetch", async () => Response.json({ id: "accepted-email" }));
  assert.deepEqual(await sendAnnouncement({ announcement, message, recipients, directory, mailer: new Resend("re_test_key").emails, delayMs: 0 }), { accepted: 1, skipped: 0 });
  assert.ok(!(await readdir(directory)).includes("send.lock"));
});
