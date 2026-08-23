import type { APIEmbed } from "discord-api-types/v10";
import { Resend, type EmailReceivedEvent } from "resend";

import { sendDiscordMessageEmbed } from "@/utils/discord";
import { postHackReviewMessage } from "@/utils/hack-review";
import { createServiceClient } from "@/utils/supabase/server";

const processedWebhookIds = new Set<string>();
const MAX_DEDUPE_IDS = 500;

function rememberWebhookId(id: string): void {
  processedWebhookIds.add(id);
  if (processedWebhookIds.size > MAX_DEDUPE_IDS) {
    const oldest = processedWebhookIds.values().next().value;
    if (oldest) processedWebhookIds.delete(oldest);
  }
}

function stripQuotedReply(text: string): string {
  const withoutHistory = text.split(
    /\n(?:On .+wrote:|From:\s.+|[-_]{2,}\s*Original Message\s*[-_]{2,})/i,
    1,
  )[0];
  return withoutHistory
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n")
    .trim();
}

function headerValue(
  headers: Record<string, string> | null,
  name: string,
): string | undefined {
  const entry = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return entry?.[1];
}

function replyTokenFromAddresses(
  addresses: string[],
  inboundDomain: string,
): string | null {
  const escapedDomain = inboundDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`reviews\\+([A-Za-z0-9_-]+)@${escapedDomain}`, "i");
  for (const address of addresses) {
    const match = address.match(pattern);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN;
  if (!apiKey || !webhookSecret || !inboundDomain) {
    console.warn(
      "[HackReview] RESEND_API_KEY, RESEND_WEBHOOK_SECRET, or RESEND_INBOUND_DOMAIN is missing; skipping inbound email.",
    );
    return new Response("Resend inbound email is not configured", { status: 202 });
  }

  const rawBody = await request.text();
  const webhookId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!webhookId || !timestamp || !signature) {
    return new Response("Missing webhook signature", { status: 401 });
  }
  if (processedWebhookIds.has(webhookId)) {
    return new Response("Already processed", { status: 200 });
  }

  const resend = new Resend(apiKey);
  let event: EmailReceivedEvent;
  try {
    const verified = resend.webhooks.verify({
      payload: rawBody,
      headers: { id: webhookId, timestamp, signature },
      webhookSecret,
    });
    if (verified.type !== "email.received") {
      return new Response("Ignored", { status: 200 });
    }
    event = verified;
  } catch (error) {
    console.warn("[HackReview] Invalid Resend webhook signature:", error);
    return new Response("Invalid webhook signature", { status: 401 });
  }

  rememberWebhookId(webhookId);
  try {
    const { data: email, error: emailError } =
      await resend.emails.receiving.get(event.data.email_id);
    if (emailError || !email) {
      throw new Error(emailError?.message ?? "Inbound email was not found");
    }

    const serviceClient = await createServiceClient();
    const addresses = [
      ...event.data.to,
      ...event.data.received_for,
      ...email.to,
      ...email.received_for,
    ];
    const replyToken = replyTokenFromAddresses(addresses, inboundDomain);
    let reviewThread = null;

    if (replyToken) {
      const escapedReplyToken = replyToken.replaceAll("_", "\\_");
      const { data, error } = await serviceClient
        .from("hack_review_threads")
        .select("*")
        .ilike("reply_token", escapedReplyToken)
        .maybeSingle();
      if (error) throw error;
      reviewThread = data;
    }

    if (!reviewThread) {
      const referenceHeaders = [
        headerValue(email.headers, "in-reply-to"),
        headerValue(email.headers, "references"),
      ].filter((value): value is string => Boolean(value));
      const messageIds = Array.from(new Set(
        referenceHeaders.flatMap((value) => {
          const bracketedIds = value.match(/<[^>]+>/g) ?? [];
          return [
            value.trim(),
            ...bracketedIds,
            ...bracketedIds.map((id) => id.slice(1, -1)),
            ...value.split(/\s+/).filter(Boolean),
          ];
        }),
      ));
      if (messageIds.length > 0) {
        const { data, error } = await serviceClient
          .from("hack_review_threads")
          .select("*")
          .in("resend_last_message_id", messageIds)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        reviewThread = data;
      }
    }

    if (reviewThread?.resend_last_email_id === email.id) {
      return new Response("Already processed", { status: 200 });
    }

    const body = stripQuotedReply(email.text ?? "");
    const embed: APIEmbed = {
      title: (email.subject || "(No subject)").slice(0, 256),
      description: (body || "(No plain-text body)").slice(0, 3500),
      color: 0x5865f2,
      fields: [
        { name: "From", value: email.from.slice(0, 1024), inline: true },
        ...(!reviewThread
          ? [{
              name: "To",
              value: (email.to.join(", ") || inboundDomain).slice(0, 1024),
              inline: true,
            }]
          : []),
      ],
    };

    if (reviewThread) {
      await postHackReviewMessage(reviewThread, { embeds: [embed] });
      const { error: updateError } = await serviceClient
        .from("hack_review_threads")
        .update({
          resend_last_email_id: email.id,
          resend_last_message_id: email.message_id,
        })
        .eq("hack_slug", reviewThread.hack_slug);
      if (updateError) {
        console.error("[HackReview] Failed to persist inbound email metadata:", updateError);
      }
    } else if (process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) {
      await sendDiscordMessageEmbed(
        process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL,
        [embed],
      );
    } else {
      console.warn("[HackReview] Inbound email was unmatched and no admin webhook is configured.");
    }

    return new Response("Processed", { status: 200 });
  } catch (error) {
    processedWebhookIds.delete(webhookId);
    console.error("[HackReview] Failed to process inbound email:", error);
    return new Response("Failed to process inbound email", { status: 500 });
  }
}
