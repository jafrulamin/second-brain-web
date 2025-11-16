/**
 * AI provider abstraction layer
 * Supports multiple providers for embeddings and LLM generation
 * - Ollama (local, free)
 * - OpenAI (hosted)
 * - Groq (hosted, fast inference)
 */

import { cfg, isOllamaEmbed, isOllamaLLM } from '@/lib/config';
import { embedWithOllama, generateStreamWithOllama, generateWithOllama } from '@/lib/ollama';

/**
 * Generate embeddings for an array of texts using the configured provider
 * @param texts - Array of text strings to embed
 * @returns Array of embedding vectors (same order as input)
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const provider = cfg.PROVIDER_EMBED;

  if (provider === 'ollama' || isOllamaEmbed()) {
    // Use local Ollama for embeddings
    return await embedWithOllama(texts);
  } else if (provider === 'openai') {
    // Use OpenAI embeddings
    return await embedWithOpenAI(texts);
  } else if (provider === 'voyageai') {
    // Use Voyage AI embeddings (FREE tier, optimized for RAG)
    return await embedWithVoyageAI(texts);
  } else {
    throw new Error(`Unknown embedding provider: ${provider}. Supported: ollama, openai, voyageai`);
  }
}

/**
 * Generate embeddings using Voyage AI API (FREE tier available, optimized for RAG)
 */
async function embedWithVoyageAI(texts: string[]): Promise<number[][]> {
  if (!cfg.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY not configured. Set it in environment variables.');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Voyage AI] Embedding ${texts.length} texts using voyage-2`);
  }

  try {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'voyage-2',
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response from Voyage AI: missing data array');
    }

    const embeddings = data.data.map((item: any) => item.embedding);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Voyage AI] Successfully generated ${embeddings.length} embeddings`);
    }

    return embeddings;
  } catch (error: any) {
    console.error('[Voyage AI] Embedding error:', error);
    throw error;
  }
}

/**
 * Generate embeddings using OpenAI API
 */
async function embedWithOpenAI(texts: string[]): Promise<number[][]> {
  if (!cfg.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured. Set it in environment variables.');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[OpenAI] Embedding ${texts.length} texts using text-embedding-3-small`);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response from OpenAI: missing data array');
    }

    // Extract embeddings in order
    const embeddings = data.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.embedding);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[OpenAI] Successfully generated ${embeddings.length} embeddings`);
    }

    return embeddings;
  } catch (error: any) {
    console.error('[OpenAI] Embedding error:', error);
    throw error;
  }
}

/**
 * Generate text completion using the configured LLM provider
 * @param prompt - The prompt to send to the LLM
 * @param opts - Options including streaming support
 * @returns Generated text or async iterable for streaming
 */
export async function generateAnswer(
  prompt: string,
  opts?: { stream?: boolean; signal?: AbortSignal }
): Promise<string | AsyncGenerator<string, void, unknown>> {
  const provider = cfg.PROVIDER_LLM;

  if (provider === 'ollama' || isOllamaLLM()) {
    // Use local Ollama for generation
    if (opts?.stream) {
      return generateStreamWithOllama(prompt, opts.signal);
    } else {
      return await generateWithOllama(prompt);
    }
  } else if (provider === 'openai') {
    // Use OpenAI for generation (non-streaming for demo)
    return await generateWithOpenAI(prompt);
  } else if (provider === 'groq') {
    // Use Groq for generation (non-streaming for demo)
    return await generateWithGroq(prompt);
  } else {
    throw new Error(`Unknown LLM provider: ${provider}. Supported: ollama, openai, groq`);
  }
}

/**
 * Generate text using OpenAI API (non-streaming)
 */
async function generateWithOpenAI(prompt: string): Promise<string> {
  if (!cfg.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured. Set it in environment variables.');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[OpenAI] Generating response using gpt-3.5-turbo');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI: missing content');
    }

    const content = data.choices[0].message.content;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[OpenAI] Successfully generated response (${content.length} chars)`);
    }

    return content;
  } catch (error: any) {
    console.error('[OpenAI] Generation error:', error);
    throw error;
  }
}

/**
 * Generate text using Groq API (non-streaming)
 */
async function generateWithGroq(prompt: string): Promise<string> {
  if (!cfg.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Set it in environment variables.');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Groq] Generating response using llama-3.3-70b-versatile');
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from Groq: missing content');
    }

    const content = data.choices[0].message.content;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Groq] Successfully generated response (${content.length} chars)`);
    }

    return content;
  } catch (error: any) {
    console.error('[Groq] Generation error:', error);
    throw error;
  }
}

/**
 * Get the current embedding model name (for metadata)
 */
export function getEmbedModelName(): string {
  const provider = cfg.PROVIDER_EMBED;
  
  if (provider === 'ollama') {
    return cfg.OLLAMA_EMBED_MODEL;
  } else if (provider === 'openai') {
    return 'text-embedding-3-small';
  } else {
    return provider;
  }
}

/**
 * Get the current LLM model name (for metadata)
 */
export function getLLMModelName(): string {
  const provider = cfg.PROVIDER_LLM;
  
  if (provider === 'ollama') {
    return cfg.OLLAMA_LLM_MODEL;
  } else if (provider === 'openai') {
    return 'gpt-3.5-turbo';
  } else if (provider === 'groq') {
    return 'llama-3.3-70b-versatile';
  } else {
    return provider;
  }
}

