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
  const name = withoutAt(q);
  if (!name) return false;
  const title = normalize(hack.title);
  if (title === q || withoutAt(normalize(hack.author)) === name) return true;
  return q.length >= MIN_PARTIAL_TITLE_QUERY && title.includes(q);
}
