export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

type FetchInChunksFn<TItem, TResult> = (
  chunk: TItem[],
) => Promise<{ data: TResult[] | null; error: unknown }>;
export async function fetchInChunks<TItem, TResult>(
  array: TItem[],
  size: number,
  fn: FetchInChunksFn<TItem, TResult>,
): Promise<{ data: TResult[]; error: unknown | null }> {
  const chunks = chunk(array, size);
  const results = await Promise.all(chunks.map(fn));

  const data: TResult[] = [];
  for (const result of results) {
    if (result.error) return { data: [], error: result.error };
    if (result.data) data.push(...result.data);
  }
  return { data, error: null };
}
