import { baseRoms } from "@/data/baseRoms";
import { Constants } from "@/types/db";
import type { DiscoverSortOption } from "@/types/discover";

export interface DiscoverUrlState {
  query: string;
  sort: DiscoverSortOption;
  page: number;
  tags: string[];
  baseRoms: string[];
  completionStatuses: string[];
  onlyReady: boolean;
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;
type SearchParamsLike = URLSearchParams | SearchParamsRecord;

export const DISCOVER_DEFAULT_STATE: DiscoverUrlState = {
  query: "",
  sort: "trending",
  page: 1,
  tags: [],
  baseRoms: [],
  completionStatuses: [],
  onlyReady: false,
};

export const DISCOVER_COMPLETION_STATUSES = Constants.public.Enums["Completion Status"];

const VALID_BASE_ROM_IDS = new Set(baseRoms.map((rom) => rom.id));
const VALID_COMPLETION_STATUSES = new Set<string>(DISCOVER_COMPLETION_STATUSES);

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function discoverUrlStatesEqual(a: DiscoverUrlState, b: DiscoverUrlState) {
  return (
    a.query === b.query &&
    a.sort === b.sort &&
    a.page === b.page &&
    a.onlyReady === b.onlyReady &&
    arraysEqual(a.tags, b.tags) &&
    arraysEqual(a.baseRoms, b.baseRoms) &&
    arraysEqual(a.completionStatuses, b.completionStatuses)
  );
}

function getValues(params: SearchParamsLike, key: string): string[] {
  if (params instanceof URLSearchParams) {
    return params.getAll(key);
  }

  const value = params[key];
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? [value] : [];
}

function getFirstValue(params: SearchParamsLike, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = getValues(params, key).find((item) => item.length > 0);
    if (value !== undefined) return value;
  }
}

function getListValues(params: SearchParamsLike, keys: string[]): string[] {
  for (const key of keys) {
    const values = getValues(params, key)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length > 0) {
      return Array.from(new Set(values));
    }
  }

  return [];
}

export function normalizeDiscoverSort(value: string | undefined): DiscoverSortOption {
  if (value === "alpha" || value === "alphabetical") return "alpha";
  if (value === "popular" || value === "new" || value === "updated" || value === "trending") return value;
  return DISCOVER_DEFAULT_STATE.sort;
}

function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isFinite(page) && page > 0 ? page : DISCOVER_DEFAULT_STATE.page;
}

function parseReady(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes"].includes(value.toLowerCase());
}

export function parseDiscoverSearchParams(params: SearchParamsLike): DiscoverUrlState {
  const onlyReady = parseReady(getFirstValue(params, ["r", "ready"]));
  const baseRomValues = getListValues(params, ["b", "baseRom", "baseRoms"]).filter((id) => VALID_BASE_ROM_IDS.has(id));

  return {
    query: getFirstValue(params, ["q", "query"]) ?? DISCOVER_DEFAULT_STATE.query,
    sort: normalizeDiscoverSort(getFirstValue(params, ["s", "sort"])),
    page: parsePage(getFirstValue(params, ["p", "page"])),
    tags: getListValues(params, ["t", "tags"]),
    baseRoms: onlyReady ? [] : baseRomValues,
    completionStatuses: getListValues(params, ["c", "completion"]).filter((status) => VALID_COMPLETION_STATUSES.has(status)),
    onlyReady,
  };
}

export function buildDiscoverSearchParams(state: DiscoverUrlState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.query) params.set("q", state.query);
  if (state.sort !== DISCOVER_DEFAULT_STATE.sort) params.set("s", state.sort);
  if (state.page > DISCOVER_DEFAULT_STATE.page) params.set("p", String(state.page));
  state.tags.forEach((tag) => params.append("t", tag));
  state.baseRoms.forEach((baseRom) => params.append("b", baseRom));
  state.completionStatuses.forEach((status) => params.append("c", status));
  if (state.onlyReady) params.set("r", "1");

  return params;
}

export function validateDiscoverTags(state: DiscoverUrlState, validTags: Iterable<string>): DiscoverUrlState {
  const valid = new Set(validTags);
  const tags = state.tags.filter((tag) => valid.has(tag));

  return tags.length === state.tags.length ? state : { ...state, tags };
}
