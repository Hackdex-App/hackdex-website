import type { Platform } from "@/data/baseRoms";

export type EmulatorPick = { name: string; url: string };
export type EmulatorGuide = { os: string; picks: EmulatorPick[] }[];

const RETROARCH_ANDROID = "https://play.google.com/store/apps/details?id=com.retroarch";
const RETROARCH_IOS = "https://apps.apple.com/us/app/retroarch/id6499539433";
const MANIC_IOS = "https://apps.apple.com/us/app/manic-emu-game-emulator/id6743335790";

/** Recommended emulators per platform. Mirrors the FAQ's "Recommended emulators" tables. */
const GB: EmulatorGuide = [
  { os: "Desktop", picks: [{ name: "SameBoy", url: "https://sameboy.github.io/" }] },
  { os: "Android", picks: [{ name: "RetroArch (SameBoy core)", url: RETROARCH_ANDROID }] },
  { os: "iOS", picks: [{ name: "SameBoy", url: "https://apps.apple.com/us/app/sameboy/id6496971295" }] },
];

export const EMULATORS: Record<Platform, EmulatorGuide> = {
  GB,
  GBC: GB,
  GBA: [
    { os: "Desktop", picks: [{ name: "mGBA", url: "https://mgba.io/" }] },
    {
      os: "Android",
      picks: [
        { name: "Pizza Boy", url: "https://play.google.com/store/apps/details?id=com.dothq.pizzaboy" },
        { name: "Lemuroid", url: "https://play.google.com/store/apps/details?id=com.swordfish.lemuroid" },
        { name: "RetroArch", url: RETROARCH_ANDROID },
      ],
    },
    {
      os: "iOS",
      picks: [
        { name: "RetroArch", url: RETROARCH_IOS },
        { name: "Manic EMU", url: MANIC_IOS },
      ],
    },
  ],
  NDS: [
    { os: "Desktop", picks: [{ name: "melonDS", url: "https://melonds.kuribo64.net/" }] },
    { os: "Android", picks: [{ name: "RetroArch (melonDS core)", url: RETROARCH_ANDROID }] },
    {
      os: "iOS",
      picks: [
        { name: "Delta", url: "https://apps.apple.com/us/app/delta-game-emulator/id1048524688" },
        { name: "RetroArch", url: RETROARCH_IOS },
        { name: "Manic EMU", url: MANIC_IOS },
      ],
    },
  ],
};
