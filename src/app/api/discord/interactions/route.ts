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

const REPLY_MODAL_ID = "hackdex_reply";
const REPLY_MESSAGE_ID = "message";
const REPLY_MESSAGE_MAX_LENGTH = 1800;
const DISCORD_MODAL_TITLE_MAX = 45;
const DISCORD_MODAL_LABEL_MAX = 45;
const DISCORD_MODAL_DESCRIPTION_MAX = 100;

type DiscordModalComponent = {
  type?: number;
  custom_id?: string;
  value?: string;
  component?: DiscordModalComponent;
  components?: DiscordModalComponent[];
};

type DiscordInteraction = {
  application_id: string;
  token: string;
  type: number;
  channel_id?: string;
  data?: {
    name?: string;
    type?: number;
    custom_id?: string;
    options?: Array<{ name: string; value?: string }>;
    components?: DiscordModalComponent[];
  };
  member?: {
    nick?: string | null;
    roles?: string[];
    user?: {
      id?: string;
      avatar?: string | null;
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

function discordText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

function adminDisplayName(interaction: DiscordInteraction): string {
  return interaction.member?.nick
    || interaction.member?.user?.global_name
    || interaction.member?.user?.username
    || "Hackdex admin";
}

function replyModal(context?: {
  title: string;
  author: string;
  adminName: string;
}): Response {
  return Response.json({
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: REPLY_MODAL_ID,
      title: context
        ? discordText(context.title, DISCORD_MODAL_TITLE_MAX)
        : "Email the submitter",
      components: [
        {
          type: 18,
          label: context
            ? discordText(`Message to ${context.author}`, DISCORD_MODAL_LABEL_MAX)
            : "Message",
          description: context
            ? discordText(`This will be sent as ${context.adminName}.`, DISCORD_MODAL_DESCRIPTION_MAX)
            : "This is emailed to the hack creator.",
          component: {
            type: 4,
            custom_id: REPLY_MESSAGE_ID,
            style: 2,
            required: true,
            max_length: REPLY_MESSAGE_MAX_LENGTH,
            placeholder: "Write the review reply…",
          },
        },
      ],
    },
  });
}

async function loadReplyModalContext(channelId: string): Promise<{
  title: string;
  author: string;
} | null> {
  const serviceClient = await createServiceClient();
  const { data: row, error } = await serviceClient
    .from("hack_review_threads")
    .select("hacks!inner(title, created_by)")
    .eq("discord_thread_id", channelId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("username")
    .eq("id", row.hacks.created_by)
    .maybeSingle();
  if (profileError) {
    console.warn(
      "[HackReview] Failed to load the hack creator profile:",
      profileError,
    );
  }

  return {
    title: row.hacks.title,
    author: profile?.username ?? "the hack creator",
  };
}

function configuredReplyRoleIds(): string[] {
  return (process.env.DISCORD_REPLY_ROLE_IDS ?? "")
    .split(",")
    .map((roleId) => roleId.trim())
    .filter(Boolean);
}

function replyAccessError(interaction: DiscordInteraction): string | null {
  const replyRoleIds = configuredReplyRoleIds();
  if (replyRoleIds.length === 0) {
    console.error(
      "[HackReview] DISCORD_REPLY_ROLE_IDS is missing or empty; refusing /reply.",
    );
    return "This command is not configured.";
  }
  const memberRoles = interaction.member?.roles ?? [];
  if (!replyRoleIds.some((roleId) => memberRoles.includes(roleId))) {
    return "You do not have permission to use this command.";
  }
  return null;
}

/** Walk Label or Action Row payloads to find a text input by custom_id. */
function findTextInputValue(
  components: DiscordModalComponent[] | undefined,
  customId: string,
): string | undefined {
  if (!components) return undefined;
  for (const component of components) {
    if (component.custom_id === customId && typeof component.value === "string") {
      return component.value;
    }
    const nested = component.component
      ? findTextInputValue([component.component], customId)
      : undefined;
    if (nested !== undefined) return nested;
    const fromList = findTextInputValue(component.components, customId);
    if (fromList !== undefined) return fromList;
  }
  return undefined;
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

function deferReplyAndEmail(interaction: DiscordInteraction, message: string): Response {
  after(async () => {
    let emailSentConfirmation: string | null = null;
    let threadPostSucceeded = false;
    try {
      const accessError = replyAccessError(interaction);
      if (accessError) {
        await editDeferredResponse(interaction, accessError);
        return;
      }

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

      const adminName = adminDisplayName(interaction);
      const discordUser = interaction.member?.user;
      const avatarUrl = discordUser?.id && discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : undefined;
      const emailResult = await emailHackCreator({
        hackSlug: reviewThread.hack_slug,
        message,
        adminName,
      });
      if (!emailResult.ok) {
        await editDeferredResponse(interaction, emailResult.error);
        return;
      }
      emailSentConfirmation = `emailed ${emailResult.email} as ${adminName}`;

      const threadPostResult = await postHackReviewMessage(reviewThread, {
        embeds: [{
          title: emailResult.subject,
          author: {
            name: adminName,
            ...(avatarUrl ? { icon_url: avatarUrl } : {}),
          },
          description: message,
          footer: {
            text: emailResult.creatorUsername
              ? `Sent to the email of ${emailResult.creatorUsername}`
              : "Sent to the email of the hack creator",
          },
          color: 0x57f287,
        }],
      });
      threadPostSucceeded = threadPostResult === "posted";
      await editDeferredResponse(
        interaction,
        threadPostSucceeded
          ? emailSentConfirmation
          : `${emailSentConfirmation}. The review thread message could not be posted.`,
      );
    } catch (error) {
      console.error("[HackReview] Failed to handle /reply:", error);
      try {
        await editDeferredResponse(
          interaction,
          emailSentConfirmation
            ? threadPostSucceeded
              ? emailSentConfirmation
              : `${emailSentConfirmation}. The review thread message could not be posted.`
            : "The review email could not be sent.",
        );
      } catch (responseError) {
        console.error("[HackReview] Failed to update the deferred interaction:", responseError);
      }
    }
  });

  return Response.json({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: InteractionResponseFlags.EPHEMERAL },
  });
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
    interaction.type === InteractionType.APPLICATION_COMMAND
    && interaction.data?.name === "reply"
    && interaction.data.type === 1
  ) {
    const accessError = replyAccessError(interaction);
    if (accessError) return ephemeral(accessError);
    if (!interaction.channel_id) {
      return ephemeral("This command can only be used in a mapped Hackdex review thread.");
    }
    try {
      const context = await loadReplyModalContext(interaction.channel_id);
      if (!context) {
        return ephemeral("This command can only be used in a mapped Hackdex review thread.");
      }
      return replyModal({
        ...context,
        adminName: adminDisplayName(interaction),
      });
    } catch (error) {
      console.error("[HackReview] Failed to load /reply modal context:", error);
      return replyModal();
    }
  }

  if (
    interaction.type === InteractionType.MODAL_SUBMIT
    && interaction.data?.custom_id === REPLY_MODAL_ID
  ) {
    const message = findTextInputValue(interaction.data.components, REPLY_MESSAGE_ID)
      ?.trim();
    if (!message || !interaction.channel_id) {
      return ephemeral("A message is required.");
    }
    if (message.length > REPLY_MESSAGE_MAX_LENGTH) {
      return ephemeral("The message must be 1,800 characters or fewer.");
    }
    return deferReplyAndEmail(interaction, message);
  }

  return ephemeral("Unsupported command.");
}
