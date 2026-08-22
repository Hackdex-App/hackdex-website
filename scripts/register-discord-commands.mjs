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

const commands = [
  {
    type: 1,
    name: "reply",
    description: "Email the submitter from this review thread",
    options: [
      {
        type: 3,
        name: "message",
        description: "Message to email to the submitter",
        required: true,
        max_length: 1800,
      },
    ],
  },
];

const response = await fetch(
  `https://discord.com/api/v10/applications/${process.env.DISCORD_APPLICATION_ID}/guilds/${process.env.DISCORD_GUILD_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  },
);

if (!response.ok) {
  console.error(`Discord command registration failed (${response.status}): ${await response.text()}`);
  process.exit(1);
}

const registered = await response.json();
console.log(`Registered ${registered.length} guild command(s).`);
