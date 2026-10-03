import type { Database, Tables } from "@/types/db";

export type AiLevel = Database["public"]["Enums"]["ai_level"];

/** Content areas pick from None / Some / All; only code needs the finer scale. */
export const CONTENT_LEVELS = ["none", "some", "all"] as const satisfies readonly AiLevel[];
export const CODE_LEVELS = ["none", "little", "some", "most", "all"] as const satisfies readonly AiLevel[];

export const AI_LEVEL_LABEL: Record<AiLevel, string> = { none: "None", little: "A little", some: "Some", most: "Most", all: "All" };
/** Filled meter steps and strip shade, 0 (none) to 4 (all). */
export const AI_LEVEL_STEP: Record<AiLevel, number> = { none: 0, little: 1, some: 2, most: 3, all: 4 };

/**
 * The label's six areas in strip order: five content areas players see and
 * hear, then code. `hints` is the creator-facing meaning of each level.
 */
export const AI_AREAS = [
  {
    key: "graphics",
    name: "Graphics",
    short: "graphics",
    levels: CONTENT_LEVELS,
    hints: { some: "Some of the new art, like a title screen or a set of sprites", all: "Most or all of the new art" },
  },
  { key: "music", name: "Music & sound", short: "music", levels: CONTENT_LEVELS, hints: { some: "A few tracks or sound effects", all: "Most or all of the new music" } },
  { key: "story", name: "Story & dialogue", short: "story", levels: CONTENT_LEVELS, hints: { some: "Some lines, characters, or a side story", all: "Most or all of the writing" } },
  { key: "translation", name: "Translation", short: "translation", levels: CONTENT_LEVELS, hints: { some: "Parts of the script, like menus or a few maps", all: "Most or all of the translation" } },
  { key: "events", name: "Event scripts", short: "events", levels: CONTENT_LEVELS, hints: { some: "A few scenes or a side quest", all: "Most or all of the events" } },
  {
    key: "code",
    name: "Code",
    short: "code",
    levels: CODE_LEVELS,
    hints: {
      little: "A bug fix or a few",
      some: "It helped me write some larger features",
      most: "It wrote most of the code, and I reviewed it",
      all: "I just told the AI what to do",
    },
  },
] as const;

export type AiArea = (typeof AI_AREAS)[number]["key"];
export type AiLevels = Record<AiArea, AiLevel>;
export interface AiDisclosure {
  levels: AiLevels;
  note: string | null;
  disclosedAt: string;
}

type AiRow = Pick<Tables<"hacks">, `ai_${AiArea}` | "ai_note" | "ai_disclosed_at">;

/** Columns to select wherever a hack's label is needed. */
export const AI_SELECT = "ai_graphics,ai_music,ai_story,ai_translation,ai_events,ai_code,ai_note,ai_disclosed_at";

export const AI_HEADLINES = { content: "Contains AI", code: "AI in code only", none: "No direct AI usage" } as const;
/** Which headline a disclosure gets; Discover filters on this. */
export type AiKind = keyof typeof AI_HEADLINES;

/** null until the creator has filled in the form (all six columns are set together). */
export function aiDisclosureFromRow(row: AiRow): AiDisclosure | null {
  if (!row.ai_disclosed_at) return null;
  const levels = Object.fromEntries(AI_AREAS.map((a) => [a.key, row[`ai_${a.key}`] ?? "none"])) as AiLevels;
  return { levels, note: row.ai_note, disclosedAt: row.ai_disclosed_at };
}

/** Any content area with AI outranks code; the headline describes the hack as a whole. */
export function aiKind(levels: AiLevels): AiKind {
  if (AI_AREAS.some((a) => a.key !== "code" && levels[a.key] !== "none")) return "content";
  return levels.code !== "none" ? "code" : "none";
}

/**
 * Discover's AI filter: hide hacks whose label shows AI in any of `hide`. With `smallCode`, code at
 * "A little" (a bug fix or a few) still passes. `minor` is a separate mode that ignores `hide`: AI in
 * at most MINOR_MAX_AREAS areas, none above Some. Hacks without a label pass every filter; most use
 * no AI, and reports catch the rest.
 */
export interface AiFilter {
  hide: readonly AiArea[];
  smallCode: boolean;
  minor: boolean;
}

const MINOR_MAX_AREAS = 2;

const CONTENT_AREAS = AI_AREAS.map((a) => a.key).filter((k) => k !== "code");

/** Named filters, shown as radios; any other pick of areas is "Custom". */
export const AI_PRESETS = [
  { value: "any", label: "Any", filter: { hide: [], smallCode: false, minor: false } },
  {
    value: "minor",
    label: "Minor AI usage",
    hint: `Up to ${MINOR_MAX_AREAS} areas, none above Some`,
    filter: { hide: [], smallCode: false, minor: true },
  },
  { value: "no-content", label: "No AI content", filter: { hide: CONTENT_AREAS, smallCode: false, minor: false } },
  {
    value: "none",
    label: "No direct AI usage",
    hint: "Nothing AI-generated was intentionally added by the creator",
    filter: { hide: AI_AREAS.map((a) => a.key), smallCode: false, minor: false },
  },
] as const satisfies readonly { value: string; label: string; hint?: string; filter: AiFilter }[];
export type AiPreset = (typeof AI_PRESETS)[number]["value"];

export const NO_AI_FILTER: AiFilter = AI_PRESETS[0].filter;

/** Areas in label order, smallCode only while code is hidden, and no areas with minor, so equal filters serialize the same. */
export function normalizeAiFilter(f: AiFilter): AiFilter {
  if (f.minor) return { hide: [], smallCode: false, minor: true };
  const hide = AI_AREAS.map((a) => a.key).filter((k) => f.hide.includes(k));
  return { hide, smallCode: f.smallCode && hide.includes("code"), minor: false };
}

/** Whether the filter hides anything; "Any" doesn't. */
export function aiFilterActive(f: AiFilter) {
  return f.minor || f.hide.length > 0;
}

/** Stored value (Discover saves the pick): a preset's name, or the areas joined by "." ("code-small" for code with small use allowed). */
export function aiFilterToken(f: AiFilter): string {
  const n = normalizeAiFilter(f);
  const preset = AI_PRESETS.find((p) => sameAiFilter(p.filter, n));
  if (preset) return preset.value;
  return n.hide.map((k) => (k === "code" && n.smallCode ? "code-small" : k)).join(".");
}

function sameAiFilter(a: AiFilter, b: AiFilter) {
  return a.minor === b.minor && a.smallCode === b.smallCode && a.hide.length === b.hide.length && a.hide.every((k, i) => k === b.hide[i]);
}

export function parseAiFilter(token: string | undefined): AiFilter {
  const preset = AI_PRESETS.find((p) => p.value === token);
  if (preset || !token) return preset?.filter ?? NO_AI_FILTER;
  const parts = token.split(".");
  const hide = AI_AREAS.map((a) => a.key).filter((k) => parts.includes(k) || (k === "code" && parts.includes("code-small")));
  return normalizeAiFilter({ hide, smallCode: parts.includes("code-small"), minor: false });
}

/** The preset a filter matches, or "custom". */
export function aiPresetOf(f: AiFilter): AiPreset | "custom" {
  const token = aiFilterToken(f);
  return AI_PRESETS.find((p) => p.value === token)?.value ?? "custom";
}

/** Discover's note on what the AI filter hides: the preset's name, or a general one for a custom pick. */
export function aiFilterLabel(f: AiFilter): string {
  const preset = aiPresetOf(f);
  return preset === "custom" ? "Some AI usage hidden" : AI_PRESETS.find((p) => p.value === preset)!.label;
}

export function matchesAiFilter(levels: AiLevels | null, f: AiFilter) {
  if (!levels) return true;
  if (f.minor) {
    const used = AI_AREAS.filter((a) => levels[a.key] !== "none");
    return used.length <= MINOR_MAX_AREAS && used.every((a) => AI_LEVEL_STEP[levels[a.key]] <= AI_LEVEL_STEP.some);
  }
  return f.hide.every((k) => levels[k] === "none" || (k === "code" && f.smallCode && levels.code === "little"));
}

/** Validates untrusted input (server actions) against each area's allowed levels. */
export function parseAiLevels(input: unknown): AiLevels | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const out: Partial<AiLevels> = {};
  for (const area of AI_AREAS) {
    const level = record[area.key];
    if (!(area.levels as readonly unknown[]).includes(level)) return null;
    out[area.key] = level as AiLevel;
  }
  return out as AiLevels;
}

/** Row fields for saving a disclosure; stamps it as confirmed now. */
export function aiColumns(levels: AiLevels, note: string | null) {
  return {
    ai_graphics: levels.graphics,
    ai_music: levels.music,
    ai_story: levels.story,
    ai_translation: levels.translation,
    ai_events: levels.events,
    ai_code: levels.code,
    ai_note: note?.trim() || null,
    ai_disclosed_at: new Date().toISOString(),
  } satisfies Partial<Tables<"hacks">>;
}
