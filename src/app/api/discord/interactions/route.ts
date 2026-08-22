import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
} from "discord-interactions";
import { after } from "next/server";

import {
  getDiscordThread,
  verifyDiscordRequest,
} from "@/utils/discord-rest";
import {
  emailHackCreator,
  postHackReviewMessage,
} from "@/utils/hack-review";
import { createServiceClient } from "@/utils/supabase/server";

type DiscordInteraction = {
  application_id: string;
  token: string;
  type: number;
  channel_id?: string;
  data?: {
    name?: string;
    type?: number;
    options?: Array<{ name: string; value?: string }>;
  };
  member?: {
    nick?: string | null;
    user?: {
      global_name?: string | null;
      username?: string;
    };
  };
};

function ephemeral(content: string): Response {
  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  });
}

async function editDeferredResponse(
  interaction: DiscordInteraction,
  content: string,
): Promise<void> {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  if (!response.ok) {
    throw new Error(`Discord interaction response failed: ${response.status} ${await response.text()}`);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const isValid = await verifyDiscordRequest(
    rawBody,
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
  );
  if (!isValid) {
    return new Response("Invalid request signature", { status: 401 });
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG });
  }

  if (
    interaction.type !== InteractionType.APPLICATION_COMMAND
    || interaction.data?.name !== "reply"
    || interaction.data.type !== 1
  ) {
    return ephemeral("Unsupported command.");
  }

  const message = interaction.data.options
    ?.find((option) => option.name === "message")
    ?.value
    ?.trim();
  if (!message || !interaction.channel_id) {
    return ephemeral("A message is required.");
  }
  if (message.length > 1800) {
    return ephemeral("The message must be 1,800 characters or fewer.");
  }

  const deferredResponse = Response.json({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: InteractionResponseFlags.EPHEMERAL },
  });

  after(async () => {
    try {
      const serviceClient = await createServiceClient();
      const { data: reviewThread, error } = await serviceClient
        .from("hack_review_threads")
        .select("*")
        .eq("discord_thread_id", interaction.channel_id!)
        .maybeSingle();
      if (error) throw error;

      const discordThread = reviewThread
        ? await getDiscordThread(interaction.channel_id!)
        : null;
      if (
        !reviewThread
        || !discordThread
        || discordThread.parent_id !== reviewThread.discord_parent_channel_id
      ) {
        await editDeferredResponse(
          interaction,
          "This command can only be used in a mapped Hackdex review thread.",
        );
        return;
      }

      const adminName = interaction.member?.nick
        || interaction.member?.user?.global_name
        || interaction.member?.user?.username
        || "Hackdex admin";
      const emailResult = await emailHackCreator({
        hackSlug: reviewThread.hack_slug,
        message,
        adminName,
      });
      if (!emailResult.ok) {
        await editDeferredResponse(interaction, emailResult.error);
        return;
      }

      await postHackReviewMessage(reviewThread, {
        content: `**${adminName} emailed the submitter:**\n${message}`,
      });
      await editDeferredResponse(
        interaction,
        `emailed ${emailResult.email} as ${adminName}`,
      );
    } catch (error) {
      console.error("[HackReview] Failed to handle /reply:", error);
      try {
        await editDeferredResponse(
          interaction,
          "The review email could not be sent.",
        );
      } catch (responseError) {
        console.error("[HackReview] Failed to update the deferred interaction:", responseError);
      }
    }
  });

  return deferredResponse;
}
