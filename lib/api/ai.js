import { getAiReply } from '../aiApi.js';
// /ai/groq  /ai/gpt  /ai/llama  /ai/translate  /ai/tools/generate
import { getJson, getAuto } from './wolvarex.js';
import { extractText, findUrl, pickResult, summarizeShape } from './normalize.js';
import { AppError, ApiError } from '../utils/errors.js';
import { fetchWithTimeout } from '../utils/http.js';
import { logger } from '../utils/logger.js';

const CHAT_PATHS = { groq: '/ai/groq', gpt: '/ai/gpt', llama: '/ai/llama' };
export const MAX_PROMPT_CHARS = 2000;

export function cleanPrompt(text) {
  const p = String(text || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  if (!p) throw new AppError('Please include a question or prompt.', { kind: 'invalid_input' });
  if (p.length > MAX_PROMPT_CHARS) throw new AppError(`That prompt is too long (max ${MAX_PROMPT_CHARS} characters).`, { kind: 'invalid_input' });
  return p;
}

export async function askAi(provider, prompt) {
  const q = cleanPrompt(prompt);
  // Provider-named legacy commands all use the configured Neosoft Gemini endpoint.
  return getAiReply(q);
}

// Wolvarex first (undocumented params, so the common aliases are sent
// together); the free MyMemory service is kept as a fallback so .translate
// keeps working exactly as it did before.
export async function translateText(text, target = 'en') {
  const t = cleanPrompt(text);
  const to = String(target || 'en').trim();
  if (!/^[a-zA-Z]{2,3}([-_][a-zA-Z]{2,4})?$/.test(to)) throw new AppError('Use a language code like en, es, fr, pt-BR. See .listlanguages', { kind: 'invalid_input' });
  const translated = await getAiReply(`Translate the following text into language code ${to}. Return only the translation, without explanations:\n\n${t}`);
  return { text: translated, provider: 'neosoft-gemini' };
}

// Returns { url } or { buffer }.
export async function generateImage({ prompt, ratio = '1:1', model = 'flux' }) {
  const p = cleanPrompt(prompt);
  const out = await getAuto('/ai/tools/generate', { prompt: p, ratio, model }, { timeoutMs: 120000, retries: 0 });
  if (out.type === 'buffer') return { buffer: out.buffer };
  const url = findUrl(pickResult(out.data), { prefer: ['url', 'image', 'images', 'output', 'result'], avoid: ['thumbnail', 'thumb'] });
  if (!url) { logger.warn('ai', 'Image generation returned no URL', summarizeShape(out.data)); throw new ApiError('No image in response', { kind: 'bad_response' }); }
  return { url };
}

// Legacy DALL-E route used by .imagine (falls back to generateImage).
export async function generateImageDalle(prompt) {
  const p = cleanPrompt(prompt);
  const out = await getAuto('/ai/image/dall-e', { q: p, prompt: p }, { timeoutMs: 120000, retries: 0 });
  if (out.type === 'buffer') return { buffer: out.buffer };
  const url = findUrl(pickResult(out.data), { prefer: ['url', 'image', 'images', 'result'], avoid: ['thumbnail', 'thumb'] });
  if (!url) throw new ApiError('No image in response', { kind: 'bad_response' });
  return { url };
}
