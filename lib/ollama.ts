/**
 * Ollama embedding integration
 * Free, local embeddings using Ollama server
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'all-minilm';
const OLLAMA_LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'llama3';

// Batch size for embedding requests (Ollama can handle more, but we'll be conservative)
const BATCH_SIZE = 64;

/**
 * Generate embeddings using local Ollama server
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors in the same order as input texts
 */
export async function embedWithOllama(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Ollama] Embedding ${texts.length} texts using model: ${OLLAMA_EMBED_MODEL}`);
  }
  
  const allEmbeddings: number[][] = [];
  
  // Process in batches
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, Math.min(i + BATCH_SIZE, texts.length));
    
    try {
      const response = await fetch(`${OLLAMA_BASE}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_EMBED_MODEL,
          input: batch,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Check for specific error types
        if (response.status === 404 || errorText.includes('model') || errorText.includes('not found')) {
          throw new Error(
            `Model "${OLLAMA_EMBED_MODEL}" not found. ` +
            `Please run: ollama pull ${OLLAMA_EMBED_MODEL}`
          );
        }
        
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        throw new Error('Invalid response from Ollama: missing embeddings array');
      }

      allEmbeddings.push(...data.embeddings);
      
    } catch (error: any) {
      // Handle connection errors
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        throw new Error(
          `Cannot connect to Ollama server at ${OLLAMA_BASE}. ` +
          `Please start the server with: ollama serve`
        );
      }
      
      if (error.cause?.code === 'ECONNREFUSED') {
        throw new Error(
          `Cannot connect to Ollama server at ${OLLAMA_BASE}. ` +
          `Please start the server with: ollama serve`
        );
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Ollama] Successfully generated ${allEmbeddings.length} embeddings`);
  }
  return allEmbeddings;
}

/**
 * Get the current Ollama model name
 */
export function getOllamaModel(): string {
  return OLLAMA_EMBED_MODEL;
}

/**
 * Get the Ollama base URL
 */
export function getOllamaBase(): string {
  return OLLAMA_BASE;
}

/**
 * Generate text using a local Ollama LLM with streaming support
 * @param prompt - The prompt to send to the LLM
 * @param signal - Optional AbortSignal for cancellation
 * @returns Async generator that yields response chunks
 */
export async function* generateStreamWithOllama(
  prompt: string,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Ollama] Streaming response using model: ${OLLAMA_LLM_MODEL}`);
  }

  // Limit prompt length to prevent memory issues
  const maxPromptLength = 8000;
  const truncatedPrompt = prompt.length > maxPromptLength 
    ? prompt.substring(0, maxPromptLength) + '\n\n[Context truncated...]'
    : prompt;

  try {
    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_LLM_MODEL,
        prompt: truncatedPrompt,
        stream: true,
        options: {
          num_predict: 500,
          temperature: 0.7,
        },
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (errorText.includes('ECONNREFUSED') || response.status === 0) {
        throw new Error(`Cannot connect to Ollama server at ${OLLAMA_BASE}. Start Ollama: \`ollama serve\``);
      }

      if (response.status === 404 || errorText.includes('model') || errorText.includes('not found')) {
        throw new Error(`Ollama LLM model "${OLLAMA_LLM_MODEL}" not found. Pull LLM model: \`ollama pull ${OLLAMA_LLM_MODEL}\``);
      }

      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
            
            // Check if streaming is complete
            if (data.done) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[Ollama] Streaming completed');
              }
              return;
            }
          } catch (parseError) {
            console.error('[Ollama] Failed to parse JSON line:', line, parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error: any) {
    // Handle abort
    if (error.name === 'AbortError') {
      console.log('[Ollama] Stream aborted by user');
      return;
    }

    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to Ollama server at ${OLLAMA_BASE}. Start Ollama: \`ollama serve\``);
    }

    if (error.cause?.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to Ollama server at ${OLLAMA_BASE}. Start Ollama: \`ollama serve\``);
    }

    throw error;
  }
}

/**
 * Generate text using a local Ollama LLM
 * @param prompt - The prompt to send to the LLM
 * @returns Generated text response
 */
export async function generateWithOllama(prompt: string): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Ollama] Generating response using model: ${OLLAMA_LLM_MODEL}`);
  }

  try {
    // Limit prompt length to prevent memory issues
    const maxPromptLength = 8000; // Characters
    const truncatedPrompt = prompt.length > maxPromptLength 
      ? prompt.substring(0, maxPromptLength) + '\n\n[Context truncated...]'
      : prompt;

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_LLM_MODEL,
        prompt: truncatedPrompt,
        stream: false,
        options: {
          num_predict: 500, // Limit response length to prevent hanging
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle connection errors
      if (errorText.includes('ECONNREFUSED') || response.status === 0) {
        throw new Error(`Cannot connect to Ollama server at ${OLLAMA_BASE}. Start Ollama: \`ollama serve\``);
      }

      // Handle model not found
      if (response.status === 404 || errorText.includes('model') || errorText.includes('not found')) {
        throw new Error(`Ollama LLM model "${OLLAMA_LLM_MODEL}" not found. Pull LLM model: \`ollama pull ${OLLAMA_LLM_MODEL}\``);
      }

      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.response || typeof data.response !== 'string') {
      throw new Error('Invalid response from Ollama: missing response field');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Ollama] Successfully generated response (${data.response.length} chars)`);
    }
    return data.response;
  } catch (error: any) {
    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to Ollama server at ${OLLAMA_BASE}. Start Ollama: \`ollama serve\``);
    }

    if (error.cause?.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to Ollama server at ${OLLAMA_BASE}. Start Ollama: \`ollama serve\``);
    }

    // Re-throw other errors (they already have helpful messages)
    throw error;
  }
}

