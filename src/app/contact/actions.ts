"use server";

import nodemailer from "nodemailer";
import { APIEmbed } from "discord-api-types/v10";
import { sendDiscordMessageEmbed } from "@/utils/discord";

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

export async function sendContact(prev: ContactActionState, formData: FormData): Promise<ContactActionState> {
  try {
    const topic = (formData.get("topic") as string | null)?.toLowerCase() as Topic | null;
    const name = (formData.get("name") as string | null) || "";
    const email = (formData.get("email") as string | null) || "";
    const contextUrl = (formData.get("contextUrl") as string | null) || "";
    const message = (formData.get("message") as string | null) || "";

    if (!topic || !(topic in topicLabels)) {
      return { error: "Please select a valid topic." };
    }

    if (!email) {
      return { error: "Email is required." };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    const ticketId = generateTicketId();
    const noreply = process.env.EMAIL_NOREPLY!;

    if (!message) {
      return { error: "Message is required." };
    }

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

    await transporter.sendMail({
      from: `Hackdex <${noreply}>`,
      to: process.env.EMAIL_ADMIN!,
      replyTo: email,
      subject,
      text: body,
    });

    const confirmationMessage = [
      `We received your message (ticket #${ticketId}).`,
      "We'll review and follow up if we need more information.",
      "\n\nSummary:",
      `Topic: ${topicLabels[topic]}`,
      name ? `Name: ${name}` : undefined,
      `Email: ${email}`,
      contextUrl ? `Related URL: ${contextUrl}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    await transporter.sendMail({
      from: `Hackdex <${noreply}>`,
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
    const message = err instanceof Error ? err.message : "Failed to send message.";
    return { error: message };
  }
}


