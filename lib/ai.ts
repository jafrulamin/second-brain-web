/**
 * AI/Embeddings integration
 * Now using FREE local Ollama instead of OpenAI
 */

// Re-export Ollama embedding functions
export { embedWithOllama, getOllamaModel, getOllamaBase } from './ollama';

// For future LLM chat features (not used yet)
// Can add OpenAI chat or local Ollama chat here later

