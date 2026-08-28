import { getOrCreateDeviceId } from "@/utils/deviceId";

export const HACK_ONBOARDING_STEPS = ["version", "selectRom", "agree"] as const;

export type HackOnboardingStep = (typeof HACK_ONBOARDING_STEPS)[number];
export type HackOnboardingStepState = "undone" | "passed" | "dismissed";
export type HackOnboardingState = Record<HackOnboardingStep, HackOnboardingStepState>;

const STORAGE_KEY_PREFIX = "hackOnboarding";

export const DEFAULT_HACK_ONBOARDING_STATE: HackOnboardingState = {
  version: "undone",
  selectRom: "undone",
  agree: "undone",
};

function storageKey(deviceId: string): string {
  return `${STORAGE_KEY_PREFIX}:${deviceId}`;
}

function isStepState(value: unknown): value is HackOnboardingStepState {
  return value === "undone" || value === "passed" || value === "dismissed";
}

export function readHackOnboardingState(): HackOnboardingState {
  if (typeof localStorage === "undefined") return { ...DEFAULT_HACK_ONBOARDING_STATE };

  try {
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return { ...DEFAULT_HACK_ONBOARDING_STATE };

    const stored = JSON.parse(localStorage.getItem(storageKey(deviceId)) ?? "{}") as Record<string, unknown>;
    return {
      version: isStepState(stored.version) ? stored.version : "undone",
      selectRom: isStepState(stored.selectRom) ? stored.selectRom : "undone",
      agree: isStepState(stored.agree) ? stored.agree : "undone",
    };
  } catch {
    return { ...DEFAULT_HACK_ONBOARDING_STATE };
  }
}

export function writeHackOnboardingState(state: HackOnboardingState): void {
  if (typeof localStorage === "undefined") return;

  try {
    const deviceId = getOrCreateDeviceId();
    if (deviceId) localStorage.setItem(storageKey(deviceId), JSON.stringify(state));
  } catch {
    // Onboarding should not interfere with patching when storage is unavailable.
  }
}

interface LeftoverStepsOptions {
  hasVersionPicker: boolean;
  romReady: boolean;
}

export function getLeftoverHackOnboardingSteps(
  state: HackOnboardingState,
  { hasVersionPicker, romReady }: LeftoverStepsOptions,
): HackOnboardingStep[] {
  const steps: HackOnboardingStep[] = [];
  const selectRomNeeded = !romReady && state.selectRom === "undone";

  if (hasVersionPicker && state.version === "undone") steps.push("version");
  if (selectRomNeeded) steps.push("selectRom");

  // A tour that still needs Select always includes Agree, even if Agree was
  // already passed or dismissed. Selecting the ROM is the first half of that pair.
  if (state.agree === "undone" || selectRomNeeded) steps.push("agree");

  return steps;
}
