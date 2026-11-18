const DEFAULT_CHUNK_SIZE = 25

export async function batchFetch<TItem, TResult>(
  items: TItem[],
  fetchChunk: (chunk: TItem[]) => Promise<TResult[]>,
  options?: { chunkSize?: number }
): Promise<TResult[]> {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE

  const chunks: TItem[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }

  const results = await Promise.all(chunks.map(chunk => fetchChunk(chunk)))
  return results.flat()
}
