import { aiFilterActive, aiFilterToken, NO_AI_FILTER, parseAiFilter, type AiFilter } from "@/utils/aiDisclosure";

const KEY = "hackdex:discover-ai";

// The AI filter is the visitor's standing preference, so it's saved on this device and never
// put in the URL (a shared link shouldn't carry it). The other filters are one-off searches.

export function readSavedAiFilter(): AiFilter {
  try {
    return parseAiFilter(localStorage.getItem(KEY) ?? undefined);
  } catch {
    return NO_AI_FILTER;
  }
}

/** "Any" clears it. */
export function saveAiFilter(filter: AiFilter) {
  try {
    if (aiFilterActive(filter)) localStorage.setItem(KEY, aiFilterToken(filter));
    else localStorage.removeItem(KEY);
  } catch {}
}
