# Creator announcements

Use the `announcement` email template for service notices to creators. It takes a title and a text message, preserves paragraph breaks, and makes HTTP/HTTPS URLs clickable. Start a line with `## ` for a section heading or `### ` for a smaller heading, such as a question. Markdown images are also supported as described below; other Markdown formatting is not supported. HTML in either field is escaped. It reuses the existing Hackdex email styling and invites replies.

The script requires Node 22.18 or newer and installed project dependencies. It uses Node's built-in TypeScript support; no additional runner is needed. Run commands from the repository root.

## Draft and preview

Give each announcement a unique, stable `id`, a `title` used as the email subject, and `ready: false`. Use `messageFile` to keep the body in a separate Markdown file:

```json
{
  "id": "ai-disclosure-explained",
  "ready": false,
  "title": "How Hackdex's AI disclosure system will work",
  "messageFile": "ai-disclosure-explained.md"
}
```

The path is resolved relative to the JSON file. Existing announcements can keep their inline `message` field; provide exactly one of `message` or `messageFile`. Both use the same formatting described above. Missing or empty message files stop the script. The ID identifies this mailing, including its delivery records. Never change it to retry the same mailing.

```sh
npm run email:announcement -- docs/announcements/terms-1.1.0.json
```

This default mode renders HTML and plain-text previews without any network access. Output is under `.local/announcements/<id>/`, which is ignored by Git. If a recipient snapshot already exists, it also reports the count.

The Terms announcement uses October 3, 2026 as the effective date and November 2, 2026 as the deadline for existing hacks. Before sending, confirm these dates match the published Terms, including the 30-day grace period, and that the updated Terms and FAQ are live. Send by September 26 to provide seven days of notice. Set `ready` to `true` only after reviewing the final copy. Production sending rejects drafts and unresolved `{{...}}` placeholders. The script does not validate legal deadlines or publish policy changes.

## Screenshots

Replace each screenshot placeholder in the message with a Markdown image on its own line, separated from surrounding text by blank lines:

```md
![AI disclosure form with a player preview](https://raw.githubusercontent.com/Hackdex-App/hackdex-website/FULL_COMMIT_SHA/docs/announcements/assets/ai-disclosure/form.png)
```

Commit and push the screenshots first, then replace `FULL_COMMIT_SHA` with the full hash of that commit. Use a public HTTP/HTTPS URL that returns the image itself. Encode spaces and parentheses in URLs as `%20`, `%28`, and `%29`. Image titles and escaped brackets in alt text are not supported.

Images fit the email's width, preserve their proportions, and link to the full-size image. The text in square brackets supplies alt text; put any visible caption in a separate paragraph. The plain-text email keeps the image description and URL in Markdown form. Regenerate the preview and send yourself a test to check loading and readability before sending to creators.

## Configuration

The npm command loads `.env.local`, then `.env.announcements` if present. Existing shell environment variables take precedence. Use `.env.announcements` for the intended production credentials and verify the source URL printed during preparation.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-server-secret
RESEND_API_KEY=your-resend-key
RESEND_FROM=Hackdex <notices@your-verified-domain>
RESEND_REPLY_TO=your-monitored-inbox@example.com
```

Preview needs no credentials. Preparing recipients needs only Supabase credentials. Test and production sending need the three Resend variables. Use a verified sender and a monitored reply inbox; the review-thread reply addresses are specific to individual hack reviews and should not be reused here.

## Prepare and review recipients

```sh
npm run email:announcement -- docs/announcements/terms-1.1.0.json --prepare
```

This reads Supabase and saves `recipients.json` without sending email. It includes creators of non-archive hacks that are approved or have an uploaded patch, identified by `current_patch` or the legacy `patch_url`. Pending, rejected, and unpublished hacks with uploads are included. Unapproved entries without an uploaded patch are excluded. Archive entries are excluded because an administrator may be their uploader. Any additional archive-related outreach needs separate review.

The query is paginated. Account emails come from Supabase Auth. Multiple hacks and accounts sharing the same normalized email result in one recipient. The snapshot includes account IDs, hack slugs, the source Supabase URL, and preparation time. Any query or account-email lookup failure stops preparation instead of silently omitting someone.

Review the saved list and count before sending. Preparation refuses to overwrite an existing snapshot. Before any production send, you can delete just `recipients.json` and prepare again if necessary. Once sending starts, the message and audience are frozen.

## Send yourself a test

```sh
npm run email:announcement -- docs/announcements/terms-1.1.0.json --test you@example.com
```

This sends one email to that address with `[TEST]` in the subject. It allows draft copy and never reads or sends to the creator snapshot. Check the layout, links, dates, and reply address. It does not mark any creator as notified.

## Send the reviewed announcement

```sh
npm run email:announcement -- docs/announcements/terms-1.1.0.json --send
```

This sends one individual email per saved recipient, at most one request per second. Check your Resend account's available daily/monthly quota before starting. Each accepted message is recorded with its Resend email ID, timestamp, account IDs, and stable idempotency key. Subsequent runs skip accepted recipients. A lock prevents simultaneous sends from the same directory. The first run saves the exact message and audience in `payload.json`; subsequent runs refuse changed content or recipients.

Resend acceptance is not confirmation of delivery or reading. Check delivery events, bounces, and suppressions in the Resend dashboard after sending. Do not use this script to bypass suppressed addresses or send promotional mail to people without the appropriate subscription.

## Interrupted or failed sends

A `.pending.json` record is written before each request. On an API error, network failure, or interruption, the script stops. It will not automatically resend an unresolved attempt, even after Resend's 24-hour idempotency window expires.

Inspect the pending record and Resend's logs. If Resend accepted the email, add its `emailId` to the record and rename its suffix from `.pending.json` to `.sent.json`. If you establish that Resend did not accept it, remove that pending record and rerun the same command. If the outcome remains uncertain, leave it pending. Known rejections such as quota or rate-limit errors also require resolving the pending record before retrying.

If a process was killed, `send.lock` may remain. Remove it only after checking that no sender is still running, then resolve any pending attempt. Do not delete `payload.json` or accepted-send records to bypass a mismatch. Restore the original message and snapshot instead.

Keep a private backup of the campaign directory. It contains recipient addresses and is the durable duplicate-send record. Do not commit it, publish it, or restart the mailing from another machine without transferring that state. Update the announcement by starting a new ID only when you intentionally want a separate mailing.

## Verification

```sh
npm run test:announcement
npx tsc --noEmit --incremental false
```

Tests use temporary files and stub only external HTTP calls. They do not contact Supabase or send real emails.
