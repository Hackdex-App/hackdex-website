export const discordGuildCommands = [
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
