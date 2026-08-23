import { randomBytes } from "node:crypto";

import type { APIEmbed } from "discord-api-types/v10";
import { Resend } from "resend";

import { renderEmail } from "@/emails/render";
import type { Tables } from "@/types/db";
import {
  createDiscordReviewThread,
  postDiscordThreadMessage,
} from "@/utils/discord-rest";
import { createServiceClient } from "@/utils/supabase/server";

export type HackReviewThread = Tables<"hack_review_threads">;

export async function getHackReviewThread(
  hackSlug: string,
): Promise<HackReviewThread | null> {
  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from("hack_review_threads")
    .select("*")
    .eq("hack_slug", hackSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensureHackReviewThread(args: {
  slug: string;
  title: string;
  author?: string | null;
  isArchive?: boolean;
}): Promise<HackReviewThread | null> {
  if (args.isArchive) return null;

  const existing = await getHackReviewThread(args.slug);
  if (existing) return existing;

  const discordThread = await createDiscordReviewThread(args);
  if (!discordThread) return null;

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from("hack_review_threads")
    .insert({
      hack_slug: args.slug,
      discord_thread_id: discordThread.id,
      discord_parent_channel_id:
        discordThread.parent_id ?? process.env.DISCORD_REVIEW_FORUM_CHANNEL_ID!,
      reply_token: randomBytes(24).toString("hex"),
    })
    .select("*")
    .single();

  if (!error) return data;

  const { data: racedRow } = await serviceClient
    .from("hack_review_threads")
    .select("*")
    .eq("hack_slug", args.slug)
    .maybeSingle();
  if (racedRow) return racedRow;
  throw error;
}

export async function postHackReviewMessage(
  reviewThread: HackReviewThread,
  message: { content?: string; embeds?: APIEmbed[] },
): Promise<"posted" | "failed"> {
  try {
    const posted = await postDiscordThreadMessage(
      reviewThread.discord_thread_id,
      message,
    );
    if (!posted) {
      console.warn(
        `[HackReview] Discord was not configured; skipped posting to thread ${reviewThread.discord_thread_id}.`,
      );
      return "failed";
    }
    return "posted";
  } catch (error) {
    console.error(
      `[HackReview] Failed to post to existing Discord thread ${reviewThread.discord_thread_id}:`,
      error,
    );
    return "failed";
  }
}

export async function emailHackCreator(args: {
  hackSlug: string;
  message: string;
  adminName: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN;
  if (!apiKey || !inboundDomain) {
    console.warn(
      "[HackReview] RESEND_API_KEY or RESEND_INBOUND_DOMAIN is missing; skipping review email.",
    );
    return { ok: false, error: "Review email is not configured." };
  }

  const serviceClient = await createServiceClient();
  const { data: row, error } = await serviceClient
    .from("hack_review_threads")
    .select("*, hacks!inner(title, created_by)")
    .eq("hack_slug", args.hackSlug)
    .single();
  if (error || !row) {
    console.error("[HackReview] Failed to load review email context:", error);
    return { ok: false, error: "Review thread was not found." };
  }

  const { data: creatorData, error: creatorError } =
    await serviceClient.auth.admin.getUserById(row.hacks.created_by);
  const creatorEmail = creatorData?.user?.email;
  if (creatorError || !creatorEmail) {
    console.error(
      "[HackReview] Failed to load the hack creator email:",
      creatorError ?? "No email found",
    );
    return { ok: false, error: "Submitter email was not found." };
  }

  const resend = new Resend(apiKey);
  const previousMessageId = row.resend_last_message_id;
  const subject = `${previousMessageId ? "Re: " : ""}${row.hacks.title} - Hackdex review`;
  const html = await renderEmail("hack-review-reply", {
    title: row.hacks.title,
    slug: args.hackSlug,
    message: args.message,
    adminName: args.adminName,
  });
  const headers = previousMessageId
    ? {
        "In-Reply-To": previousMessageId,
        References: previousMessageId,
      }
    : undefined;

  const { data: sent, error: sendError } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? `reviews@${inboundDomain}`,
    to: creatorEmail,
    replyTo: `reviews+${row.reply_token}@${inboundDomain}`,
    subject,
    html,
    text: `${args.adminName} wrote about ${row.hacks.title}:\n\n${args.message}\n\nReply to this email to respond to the Hackdex review team.`,
    headers,
  });
  if (sendError || !sent) {
    console.error("[HackReview] Resend failed to send review email:", sendError);
    return { ok: false, error: "Failed to send the review email." };
  }

  const { data: sentEmail, error: getError } = await resend.emails.get(sent.id);
  if (getError) {
    console.warn("[HackReview] Could not fetch the sent email Message-ID:", getError);
  }

  const { error: updateError } = await serviceClient
    .from("hack_review_threads")
    .update({
      resend_last_email_id: sent.id,
      resend_last_message_id: sentEmail?.message_id ?? previousMessageId,
    })
    .eq("hack_slug", args.hackSlug);
  if (updateError) {
    console.error("[HackReview] Failed to persist Resend message metadata:", updateError);
  }

  return { ok: true, email: creatorEmail };
}
