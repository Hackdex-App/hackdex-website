import type { APIEmbed, RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/v10";

export const sendDiscordMessage = async (url: string, message: RESTPostAPIWebhookWithTokenJSONBody) => {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(message),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response;
};

export const sendDiscordMessageEmbed = async (url: string, embeds: APIEmbed[]) => {
  const message: RESTPostAPIWebhookWithTokenJSONBody = {
    embeds,
  };
  return sendDiscordMessage(url, message);
};

export const sendDiscordMessageText = async (url: string, content: string) => {
  const message: RESTPostAPIWebhookWithTokenJSONBody = {
    content,
  };
  return sendDiscordMessage(url, message);
};
