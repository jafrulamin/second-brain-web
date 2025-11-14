/**
 * Similarity search utilities
 * Cosine similarity for vector comparisons
 */

/**
 * Compute cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity score between -1 and 1 (or 0 if invalid)
 */
export function cosine(a: number[], b: number[]): number {
  // Guard: vectors must have same length
  if (a.length !== b.length) {
    console.warn(`[Similarity] Vector length mismatch: ${a.length} vs ${b.length}`);
    return 0;
  }

  // Guard: empty vectors
  if (a.length === 0) {
    return 0;
  }

  // Compute dot product
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  // Compute norms
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  // Guard: zero norms
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Rank items by cosine similarity to a query vector
 * Optimized for performance with large datasets
 * @param query - Query vector
 * @param vectors - Array of items with vectors and metadata
 * @param topK - Number of top results to return
 * @returns Top K items sorted by similarity (highest first)
 */
export function rankByCosine(
  query: number[],
  vectors: {
    id: number;
    vector: number[];
    docId: number;
    chunkIndex: number;
    filename: string;
    text: string;
  }[],
  topK: number
): {
  id: number;
  vector: number[];
  docId: number;
  chunkIndex: number;
  filename: string;
  text: string;
  similarity: number;
}[] {
  if (vectors.length === 0) {
    return [];
  }

  // Pre-compute query norm once (optimization)
  let queryNorm = 0;
  for (let i = 0; i < query.length; i++) {
    queryNorm += query[i] * query[i];
  }
  queryNorm = Math.sqrt(queryNorm);

  // Use a min-heap approach: keep only top K in memory
  // This is more memory efficient than sorting all items
  const topKHeap: Array<{
    id: number;
    vector: number[];
    docId: number;
    chunkIndex: number;
    filename: string;
    text: string;
    similarity: number;
  }> = [];

  // Process vectors in batches to avoid blocking
  const BATCH_SIZE = 100;
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, Math.min(i + BATCH_SIZE, vectors.length));
    
    for (const item of batch) {
      // Optimized cosine similarity calculation
      let dotProduct = 0;
      let itemNorm = 0;
      
      for (let j = 0; j < query.length; j++) {
        dotProduct += query[j] * item.vector[j];
        itemNorm += item.vector[j] * item.vector[j];
      }
      itemNorm = Math.sqrt(itemNorm);
      
      const similarity = itemNorm > 0 && queryNorm > 0 
        ? dotProduct / (queryNorm * itemNorm)
        : 0;

      // Maintain top K heap (simple approach: keep array sorted)
      if (topKHeap.length < topK) {
        topKHeap.push({
          ...item,
          similarity,
        });
        // Sort descending when we reach capacity
        if (topKHeap.length === topK) {
          topKHeap.sort((a, b) => b.similarity - a.similarity);
        }
      } else if (similarity > topKHeap[topKHeap.length - 1].similarity) {
        // Replace the smallest if current is better
        topKHeap[topKHeap.length - 1] = {
          ...item,
          similarity,
        };
        // Re-sort (only the last element might be out of order)
        topKHeap.sort((a, b) => b.similarity - a.similarity);
      }
    }
  }

  // Return top K sorted by similarity (descending)
  return topKHeap.sort((a, b) => b.similarity - a.similarity);
}

