import type { APIEmbed } from "discord-api-types/v10";
import { verifyKey } from "discord-interactions";

const DISCORD_API_BASE = "https://discord.com/api/v10";

type DiscordThread = {
  id: string;
  parent_id?: string | null;
  applied_tags?: string[];
};

function getDiscordBotToken(): string | null {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn("[DiscordReview] DISCORD_BOT_TOKEN is missing; skipping Discord request.");
    return null;
  }
  return token;
}

async function discordRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const token = getDiscordBotToken();
  if (!token) return null;

  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "HackdexReviewBot (https://hackdex.app, 1.0)",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord API ${response.status}: ${detail}`);
  }

  if (response.status === 204) return null;
  return response.json() as Promise<T>;
}

export async function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    console.warn("[DiscordReview] DISCORD_PUBLIC_KEY is missing; cannot verify interaction.");
    return false;
  }
  if (!signature || !timestamp) return false;
  try {
    return await verifyKey(rawBody, signature, timestamp, publicKey);
  } catch {
    return false;
  }
}

export async function createDiscordReviewThread(args: {
  title: string;
  slug: string;
  author?: string | null;
}): Promise<DiscordThread | null> {
  const forumChannelId = process.env.DISCORD_REVIEW_FORUM_CHANNEL_ID;
  const pendingTagId = process.env.DISCORD_FORUM_TAG_PENDING_ID;
  if (!forumChannelId || !pendingTagId) {
    console.warn(
      "[DiscordReview] DISCORD_REVIEW_FORUM_CHANNEL_ID or DISCORD_FORUM_TAG_PENDING_ID is missing; skipping review thread creation.",
    );
    return null;
  }

  const title = Array.from(args.title).slice(0, 100).join("");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const author = args.author ? ` by **${args.author}**` : "";
  const url = siteUrl ? `${siteUrl}/hack/${encodeURIComponent(args.slug)}` : "";

  return discordRequest<DiscordThread>(`/channels/${forumChannelId}/threads`, {
    method: "POST",
    body: JSON.stringify({
      name: title,
      auto_archive_duration: 10080,
      applied_tags: [pendingTagId],
      message: {
        embeds: [{
          title: args.title,
          description: `A new hack${author} is being reviewed.${url ? `\n${url}` : ""}`,
          url: url || undefined,
          color: 0x40f56a,
        }],
      },
    }),
  });
}

export async function getDiscordThread(threadId: string): Promise<DiscordThread | null> {
  return discordRequest<DiscordThread>(`/channels/${threadId}`);
}

export async function postDiscordThreadMessage(
  threadId: string,
  message: { content?: string; embeds?: APIEmbed[] },
): Promise<boolean> {
  const result = await discordRequest<{ id: string }>(`/channels/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(message),
  });
  return result !== null;
}

export async function approveDiscordReviewThread(threadId: string): Promise<boolean> {
  const pendingTagId = process.env.DISCORD_FORUM_TAG_PENDING_ID;
  const approvedTagId = process.env.DISCORD_FORUM_TAG_APPROVED_ID;
  if (!pendingTagId || !approvedTagId) {
    console.warn(
      "[DiscordReview] DISCORD_FORUM_TAG_PENDING_ID or DISCORD_FORUM_TAG_APPROVED_ID is missing; skipping review tag update.",
    );
    return false;
  }

  const thread = await getDiscordThread(threadId);
  if (!thread) return false;

  const appliedTags = new Set(thread.applied_tags ?? []);
  appliedTags.delete(pendingTagId);
  appliedTags.add(approvedTagId);

  const updated = await discordRequest<DiscordThread>(`/channels/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify({ applied_tags: Array.from(appliedTags) }),
  });
  return updated !== null;
}
