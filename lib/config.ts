/**
 * Centralized configuration for environment variables and feature flags
 * Supports both local development (Ollama) and cloud deployment (hosted providers)
 */

export const cfg = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Demo mode - disables uploads in production
  DEMO_MODE: (process.env.DEMO_MODE || 'false') === 'true',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'file:./prisma/data/app.db',
  
  // Ollama configuration (local development)
  OLLAMA_BASE: process.env.OLLAMA_BASE || 'http://localhost:11434',
  OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL || 'all-minilm',
  OLLAMA_LLM_MODEL: process.env.OLLAMA_LLM_MODEL || 'llama3',
  
  // Provider selection
  PROVIDER_LLM: process.env.PROVIDER_LLM || 'ollama',
  PROVIDER_EMBED: process.env.PROVIDER_EMBED || 'ollama',
  
  // API keys for hosted providers
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY || '',
  
  // Storage configuration
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  VERCEL_BLOB_READ_WRITE_TOKEN: process.env.VERCEL_BLOB_READ_WRITE_TOKEN || '',
  
  // Retrieval parameters
  TOP_K: Number(process.env.TOP_K || 5),
  MAX_CONTEXT_CHARS: Number(process.env.MAX_CONTEXT_CHARS || 3000),
  PREFILTER_LIMIT: Number(process.env.PREFILTER_LIMIT || 200),
};

/**
 * Check if running in demo mode
 */
export const isDemo = (): boolean => cfg.DEMO_MODE;

/**
 * Check if running in production
 */
export const isProd = (): boolean => cfg.NODE_ENV === 'production';

/**
 * Check if using local storage
 */
export const isLocalStorage = (): boolean => cfg.STORAGE_DRIVER === 'local';

/**
 * Check if using Ollama for embeddings
 */
export const isOllamaEmbed = (): boolean => cfg.PROVIDER_EMBED === 'ollama';

/**
 * Check if using Ollama for LLM
 */
export const isOllamaLLM = (): boolean => cfg.PROVIDER_LLM === 'ollama';

