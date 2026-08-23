import { discordGuildCommands } from "../src/utils/discord-commands.mjs";

const requiredEnvironment = [
  "DISCORD_APPLICATION_ID",
  "DISCORD_GUILD_ID",
  "DISCORD_BOT_TOKEN",
];

const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
if (missingEnvironment.length > 0) {
  console.error(`Missing Discord environment: ${missingEnvironment.join(", ")}`);
  process.exit(1);
}

const response = await fetch(
  `https://discord.com/api/v10/applications/${process.env.DISCORD_APPLICATION_ID}/guilds/${process.env.DISCORD_GUILD_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(discordGuildCommands),
  },
);

if (!response.ok) {
  console.error(`Discord command registration failed (${response.status}): ${await response.text()}`);
  process.exit(1);
}

const registered = await response.json();
console.log(`Registered ${registered.length} guild command(s).`);
