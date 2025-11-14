/**
 * Text chunking utilities for splitting documents into embedable segments
 */

export interface TextChunk {
  index: number;
  text: string;
  tokenCount: number;
}

/**
 * Chunks text into overlapping segments
 * @param input - The full text to chunk
 * @param chunkSize - Target size of each chunk in characters (default: 1500)
 * @param overlap - Number of characters to overlap between chunks (default: 200)
 * @returns Array of chunks with index, text, and approximate token count
 */
export function chunkText(
  input: string,
  chunkSize: number = 1500,
  overlap: number = 200
): TextChunk[] {
  // Trim and normalize whitespace
  const text = input.trim();
  
  if (!text) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < text.length) {
    // Extract chunk of specified size
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    let chunkText = text.substring(startIndex, endIndex);

    // Trim whitespace from chunk
    chunkText = chunkText.trim();

    // Only add non-empty chunks
    if (chunkText) {
      chunks.push({
        index: chunkIndex,
        text: chunkText,
        // Use character count as approximate token count
        // (actual tokens would be ~1/4 of character count, but this is simpler)
        tokenCount: chunkText.length,
      });
      chunkIndex++;
    }

    // Move start position forward, accounting for overlap
    // If we're at the end, break to avoid infinite loop
    if (endIndex === text.length) {
      break;
    }
    
    startIndex = endIndex - overlap;
    
    // Ensure we make progress even with large overlap
    if (startIndex <= chunks[chunks.length - 1]?.index || startIndex < 0) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

