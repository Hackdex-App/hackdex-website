/** The shortest query that can match part of a title. Shorter queries need the exact title or author. */
export const MIN_PARTIAL_TITLE_QUERY = 5;

const normalize = (text: string) => text.trim().toLowerCase();
const withoutAt = (name: string) => name.replace(/^@/, "");

/**
 * Whether a Discover search is looking up this hack by name. Uncurated hacks only show up for
 * these lookups, never for browsing searches like a tag or a word from the summary.
 * Matches part of the title once the query is long enough, or the exact title or author at any
 * length. Case never matters, and the author's leading `@` is optional.
 */
export function matchesHackName(query: string, hack: { title: string; author: string }) {
  const q = normalize(query);
  if (!q) return false;
  const title = normalize(hack.title);
  if (title === q) return true;
  const name = withoutAt(q);
  if (name && withoutAt(normalize(hack.author)) === name) return true;
  // Counted by character, so emoji don't pass the minimum early.
  return [...q].length >= MIN_PARTIAL_TITLE_QUERY && title.includes(q);
}
