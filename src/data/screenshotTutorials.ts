import type { Platform } from "./baseRoms";

export type ScreenshotTutorial = {
  url: string;
  emulatorName: string;
};

export const screenshotTutorials: Partial<Record<Platform, ScreenshotTutorial>> = {
  NDS: {
    url: "https://youtu.be/3lP7Cdk7Gpo",
    emulatorName: "DeSmuMe",
  },
};

export function getScreenshotTutorial(platform: Platform | undefined): ScreenshotTutorial | null {
  if (!platform) return null;
  return screenshotTutorials[platform] || null;
}
