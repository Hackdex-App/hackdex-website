export type SocialLinks = {
  discord?: string;
  twitter?: string;
  pokecommunity?: string;
};

export type Hack = {
  slug: string;
  title: string;
  author: string;
  covers: string[];
  summary: string; // <= 120 chars (enforced in UI)
  description: string; // markdown
  tags: string[];
  downloads: number;
  baseRom: string;
  version: string;
  createdAt: string;
  updatedAt?: string;
  socialLinks?: SocialLinks;
  boxArt?: string;
};

export const hacks: Hack[] = [
  {
    slug: "fire-of-sky",
    title: "Pokémon Fire of Sky",
    author: "Teon",
    covers: [
      "https://cdn.discordapp.com/attachments/1422900356865720360/1422900357096280197/IMG_6083.PNG?ex=68e59af9&is=68e44979&hm=42268cc13f2ee393ceba28aaf282ba6b974e005687974c6439b9703fca085d43",
    ],
    summary: "A semi-casual short story romhack based on Pokemon Emerald",
    description: `Set in a time long before trainers or pokeballs, a young boy from humble beginnings sets off on an adventure with his unlikely partner. The two work together to uncover the mystery behind the sudden surge in rampaging Pokemon. The townspeople pray that Ho-Oh, their deity, will bring peace once more to their mountain village.

## IMPORTANT NOTES
- Some move animations are causing the game to crash. Turn off move animations (\`BATTLE SCENE\`) in the options menu until this is fixed.

## Tips
- You can find some helpful moves in the Move Relearner menu accessible from the Summary Screen
- You shouldn’t need to grind as long as you participate in most wild encounters (there are no trainer battles)
- Explore to find items scattered around to help prepare for big battles. There are also hidden items
- Passive healing: Your Pokemon will slowly regain health as you walk around
- TMs (Scrolls) are reusable and can be purchased from a man in town. You can also sell items to earn money
- Oran and Sitrus berries were buffed

**Known Bugs:**
- There can occasionally be some graphical glitches during battles. It only froze once on me, but make sure to save often just in case.
`,
    tags: ["Short Story", "Casual"],
    downloads: 11,
    baseRom: "Pokemon Emerald",
    version: "v1.0.2",
    createdAt: "2025-10-01",
    updatedAt: "2025-10-05",
    socialLinks: {
      discord: "https://discord.gg/hX3a63RYzZ",
      pokecommunity: "https://www.pokecommunity.com/showthread.php?t=520000",
    },
  },
  {
    slug: "emerald-redux",
    title: "Emerald Redux",
    author: "Oakwood",
    covers: [
      "https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=1200&auto=format&fit=crop",
    ],
    summary:
      "A modernized take on Emerald with QoL features, new encounters, and streamlined balancing for a fresh replay.",
    description: `## Overview
A modernized take on Pokemon Emerald that preserves its classic feel while smoothing out rough edges.

### Highlights
- Quality-of-life menus and improved learnsets
- New encounter tables and curated trainer teams
- Streamlined difficulty for smoother pacing

### Notes
Built for replayability with minimal grinding. Great for casual, challenge, and Nuzlocke runs.`,
    tags: ["QoL", "Rebalance"],
    downloads: 823,
    baseRom: "Pokemon Emerald",
    version: "v2.1.0",
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
    socialLinks: {
      discord: "https://discord.gg/emeraldredux",
      twitter: "https://x.com/emeraldredux",
      pokecommunity: "https://www.pokecommunity.com/showthread.php?t=520000",
    },
  },
  {
    slug: "crystal-clear-plus",
    title: "Crystal Clear+",
    author: "Lumi",
    covers: [
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
    ],
    summary:
      "Open world Crystal with level scaling, multi-starter support, and an expanded post-game.",
    description: `## Overview
Pokemon Crystal reimagined as an open world adventure.

### Highlights
- Level scaling across Johto and Kanto
- Choose from multiple starters at the outset
- Expanded, replayable post-game content

### Tips
Explore gyms in any order. The world adapts to your team and progress.`,
    tags: ["Open World", "Scaling"],
    downloads: 692,
    baseRom: "Pokemon Crystal",
    version: "v1.4.3",
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    slug: "firered-gauntlet",
    title: "FireRed Gauntlet",
    author: "Mira",
    covers: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop",
    ],
    summary:
      "A tough but fair challenge hack with smarter AI, improved movepools, and curated boss teams.",
    description: `## Overview
FireRed with a refined challenge curve that rewards planning over grinding.

### Highlights
- Smarter AI with better switching and coverage
- Improved movepools to increase viable strategies
- Hand-tuned boss teams with clear counterplay

### Difficulty
Challenging but fair. Expect to adjust teams and items between bosses.`,
    tags: ["Hard Mode", "AI"],
    downloads: 1102,
    baseRom: "Pokemon FireRed",
    version: "v3.0.0",
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    slug: "platinum-harmonia",
    title: "Platinum Harmonia",
    author: "Nova",
    covers: [
      "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?q=80&w=1200&auto=format&fit=crop",
    ],
    summary:
      "Lore-friendly enhancements, improved routes, and tasteful difficulty tuning for Platinum enjoyers.",
    description: `## Overview
A lore-friendly enhancement for Pokemon Platinum that polishes routes and pacing.

### Highlights
- Route and encounter refreshes that fit Sinnoh's tone
- Tasteful difficulty tuning that respects the original
- Small mechanical tweaks for smoother play

### Who it's for
Players who want a definitive Platinum experience without losing the heart of the original.`,
    tags: ["Lore", "Rebalance"],
    downloads: 512,
    baseRom: "Pokemon Platinum",
    version: "v0.9.2",
    createdAt: "2025-10-01",
  },
  {
    slug: "emerald-rogue-lite",
    title: "Emerald Rogue Lite",
    author: "Rook",
    covers: [
      "https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop",
    ],
    boxArt: 'https://images.launchbox-app.com/5ea7e17d-6e1e-47b5-84ba-c827324d851e.png',
    summary:
      "Short-session roguelite runs with randomized paths, meta-progression, and quick builds.",
    description: `## Overview
Pick-up-and-play roguelite runs in the Emerald engine with quick builds and high replayability.

### Highlights
- Randomized routes and events each run
- Meta-progression to unlock perks and options
- Fast team-building with meaningful choices

### Session length
Runs are designed for short play sessions (20–45 minutes).`,
    tags: ["Roguelite", "Randomizer"],
    downloads: 1341,
    baseRom: "Pokemon Emerald",
    version: "v0.8.0",
    createdAt: "2025-10-01",
    socialLinks: {
      discord: "https://discord.gg/emeraldrogue",
      twitter: "https://twitter.com/emeraldrogue",
      pokecommunity: "https://www.pokecommunity.com/showthread.php?t=520000",
    },
  },
  {
    slug: "black-2-reforged",
    title: "Black 2 Reforged",
    author: "Atlas",
    covers: [
      "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1200&auto=format&fit=crop",
    ],
    summary:
      "Expanded Unova dex, smarter opponents, and quality-of-life menus for a definitive B2 experience.",
    description: `## Overview
A refined take on Black 2 with an expanded Unova dex and slick QoL.

### Highlights
- Carefully selected regional and cross-gen additions
- Trainer AI and team updates that respect original balance
- QoL menus, learnset corrections, and encounter polish

### Goal
Deliver a "what-if definitive edition" feel for repeat Unova playthroughs.`,
    tags: ["Expanded Dex", "QoL"],
    downloads: 431,
    baseRom: "Pokemon Black Version 2",
    version: "v1.2.0",
    createdAt: "2025-10-01",
  },
  {
    slug: "heartgold-balance-patch",
    title: "HeartGold Balance Patch",
    author: "Sol",
    covers: [
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?q=80&w=1200&auto=format&fit=crop",
    ],
    summary:
      "Rebalances Johto with fairer gym fights, better movepools, and more viable team options.",
    description: `## Overview
An approachable rebalance that keeps Johto's charm while addressing pain points.

### Highlights
- Fairer gym difficulty curves with clearer counters
- Learnset updates to improve early- and mid-game variety
- Wider pool of viable team options without power creep

### Philosophy
Challenge through strategy, not grind.`,
    tags: ["Rebalance", "Johto"],
    downloads: 377,
    baseRom: "Pokemon HeartGold",
    version: "v1.0.5",
    createdAt: "2025-10-01",
  },
  {
    slug: "emerald-vanilla-plus",
    title: "Emerald Vanilla+",
    author: "Kai",
    covers: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
    ],
    summary:
      "Keeps the original charm while smoothing rough edges and adding unobtrusive conveniences.",
    description:
      "Keeps the original charm while smoothing rough edges and adding unobtrusive conveniences.",
    tags: ["Vanilla+", "QoL"],
    downloads: 845,
    baseRom: "Pokemon Emerald",
    version: "v1.3.1",
    createdAt: "2025-10-01",
  },
  {
    slug: "sapphire-neo",
    title: "Sapphire Neo",
    author: "Iris",
    covers: [
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop",
    ],
    summary:
      "A faithful remake with smarter trainers, refreshed encounters, and pacing improvements.",
    description: `## Overview
A faithful Sapphire remix that updates encounters, trainer logic, and pacing.

### Highlights
- Refreshed wild encounters to reduce dead zones
- Smarter trainers with modest AI improvements
- Pacing tweaks for gyms and key routes

### Result
Feels like the Sapphire you remember—just tighter and more replayable.`,
    tags: ["Remix", "AI"],
    downloads: 264,
    baseRom: "Pokemon Sapphire",
    version: "v0.7.0",
    createdAt: "2025-10-01",
  },
];


