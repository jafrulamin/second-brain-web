/**
 * RAG (Retrieval-Augmented Generation) utilities
 * Context building and prompt construction
 */

export interface ChunkSource {
  filename: string;
  chunkIndex: number;
  text: string;
}

export interface BuiltContext {
  context: string;
  sources: { filename: string; chunkIndex: number }[];
}

/**
 * Build a context string from selected chunks
 * @param chosen - Array of chunks with metadata
 * @param maxChars - Maximum characters for the context
 * @returns Context string and source metadata
 */
export function buildContext(
  chosen: ChunkSource[],
  maxChars: number
): BuiltContext {
  if (chosen.length === 0) {
    return { context: '', sources: [] };
  }

  const contextParts: string[] = [];
  const sources: { filename: string; chunkIndex: number }[] = [];
  let currentLength = 0;

  for (const chunk of chosen) {
    // Format: "Source: <filename>#<chunkIndex>\n<text>\n---\n"
    const chunkText = `Source: ${chunk.filename}#${chunk.chunkIndex}\n${chunk.text}\n---\n`;
    const chunkLength = chunkText.length;

    // Check if adding this chunk would exceed maxChars
    if (currentLength + chunkLength > maxChars && currentLength > 0) {
      break;
    }

    contextParts.push(chunkText);
    currentLength += chunkLength;

    // Track source (avoid duplicates)
    const sourceKey = `${chunk.filename}#${chunk.chunkIndex}`;
    if (!sources.some((s) => `${s.filename}#${s.chunkIndex}` === sourceKey)) {
      sources.push({
        filename: chunk.filename,
        chunkIndex: chunk.chunkIndex,
      });
    }
  }

  return {
    context: contextParts.join(''),
    sources,
  };
}

/**
 * Build a prompt for the LLM with context and question
 * @param question - User's question
 * @param context - Retrieved context from chunks
 * @returns Formatted prompt string
 */
export function buildPrompt(question: string, context: string): string {
  return `You are a helpful assistant. Use ONLY the context below to answer.
If the context does not contain the answer, say "I can't find that in the notes."
Cite sources as (filename#chunkIndex).

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:
`;
}

