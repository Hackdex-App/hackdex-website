"use server";

import { APIEmbed } from "discord-api-types/v10";
import { validateTurnstileToken } from "next-turnstile";
import { v4 } from "uuid";
import { sendDiscordMessageEmbed } from "@/utils/discord";
import { sendTransactionalEmail } from "@/utils/email";
import { validateEmail } from "@/utils/auth";

export interface ContactActionState {
  error: string | null;
  success?: string | null;
}

type Topic =
  | "general"
  | "bug"
  | "account"
  | "creator"
  | "security"
  | "other";

const topicLabels: Record<Topic, string> = {
  general: "General question",
  bug: "Bug report",
  account: "Account issue",
  creator: "Creator support",
  security: "Security disclosure",
  other: "Other",
};

function generateTicketId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HDX-${rand}`;
}

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendContact(prev: ContactActionState, formData: FormData): Promise<ContactActionState> {
  try {
    const topic = textField(formData, "topic").toLowerCase() as Topic;
    const name = textField(formData, "name");
    const email = textField(formData, "email");
    const contextUrl = textField(formData, "contextUrl");
    const message = textField(formData, "message");

    if (!Object.prototype.hasOwnProperty.call(topicLabels, topic)) {
      return { error: "Please select a valid topic." };
    }

    if (!email || email.length > 254 || validateEmail(email).error) {
      return { error: "Please enter a valid email address." };
    }

    if (!message) {
      return { error: "Message is required." };
    }
    if (name.length > 100 || message.length > 4000 || contextUrl.length > 1024) {
      return { error: "Please shorten your message or related details." };
    }
    if (contextUrl) {
      try {
        const url = new URL(contextUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return { error: "Please enter a valid related URL." };
        }
      } catch {
        return { error: "Please enter a valid related URL." };
      }
    }

    const token = formData.get("cf-turnstile-response");
    if (typeof token !== "string" || !token) {
      return { error: "Verification failed. Please try again." };
    }
    try {
      const result = await validateTurnstileToken({
        token,
        secretKey: process.env.TURNSTILE_SECRET_KEY!,
        idempotencyKey: v4(),
      });
      if (!result.success) {
        return { error: "Verification failed. Please try again." };
      }
    } catch (error) {
      console.error("Contact Turnstile validation error:", error);
      return { error: "Verification failed. Please try again." };
    }

    const ticketId = generateTicketId();

    const subject = `[#${ticketId}] ${topicLabels[topic]}${name ? ` from ${name}` : ""}`;
    const body = [
      `Topic: ${topicLabels[topic]}`,
      name ? `Name: ${name}` : undefined,
      `Email: ${email}`,
      contextUrl ? `Related URL: ${contextUrl}` : undefined,
      "",
      "Message:",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    await sendTransactionalEmail({
      to: process.env.EMAIL_CONTACT!,
      replyTo: email,
      subject,
      text: body,
    });

    const confirmationMessage =
      `We received your message (ticket #${ticketId}).\n` +
      "We'll review and follow up if we need more information.";

    await sendTransactionalEmail({
      to: email,
      subject: `[#${ticketId}] Support request confirmation`,
      text: confirmationMessage,
    });

    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_ADMIN_REPORTS_URL) {
      const embed: APIEmbed = {
        title: `📧 ${topicLabels[topic]}`,
        description: message.length > 4096 ? message.substring(0, 4093) + "..." : message,
        color: topic === "security" ? 0xff0000 : topic === "bug" ? 0xffa500 : 0x3498db,
        fields: [
          ...(name ? [{ name: "Name", value: name, inline: true }] : []),
          { name: "Email", value: email, inline: true },
          ...(contextUrl ? [{ name: "Related URL", value: contextUrl, inline: false }] : []),
        ],
        footer: {
          text: `Ticket #${ticketId}`,
        },
        timestamp: new Date().toISOString(),
      };
      await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_REPORTS_URL, [embed]);
    }

    return { error: null, success: `Your message was sent. Ticket #${ticketId}.` };
  } catch (err: unknown) {
    console.error("Contact form submission failed:", err);
    return { error: "Failed to send message. Please try again later." };
  }
}


