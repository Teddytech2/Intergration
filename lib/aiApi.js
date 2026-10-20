import { fetchWithTimeout } from './utils/http.js';
import { logger } from './utils/logger.js';
import { AppError, ApiError } from './utils/errors.js';

const GEMINI_API = 'https://api.neosoft.best/api/ai/gemini';
const IDENTITY_PATTERN = /\b(who\s+(made|created|built|owns|developed)\s+you|who('?s| is)\s+your\s+(creator|developer|owner)|who\s+are\s+you)\b/i;
const IDENTITY_ANSWER = "I'm TEDDY-XMD — created by Teddy Tech.\nRepo: https://github.com/Teddyxmd/TEDDY-XMD";

function extractText(data) {
  if (typeof data === 'string') return data.trim();
  const candidates = [
    data?.result, data?.data, data?.response, data?.reply, data?.answer,
    data?.text, data?.message, data?.output, data?.content,
    data?.candidates?.[0]?.content?.parts?.map(p => p?.text).filter(Boolean).join('\n'),
    data?.choices?.[0]?.message?.content,
    data?.data?.text, data?.data?.response, data?.result?.text, data?.result?.response
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const joined = value.map(v => typeof v === 'string' ? v : v?.text).filter(Boolean).join('\n').trim();
      if (joined) return joined;
    }
  }
  return null;
}

export async function getAiReply(prompt) {
  const q = String(prompt || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  if (!q) throw new AppError('Please include a question or prompt.', { kind: 'invalid_input' });
  if (q.length > 4000) throw new AppError('That prompt is too long (max 4000 characters).', { kind: 'invalid_input' });
  if (IDENTITY_PATTERN.test(q)) return IDENTITY_ANSWER;

  const url = new URL(GEMINI_API);
  // Send common parameter aliases because this public endpoint's exact schema
  // may vary by deployment.
  for (const key of ['prompt', 'text', 'q', 'message']) url.searchParams.set(key, q);
  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'TEDDY-XMD/1.0' }
    }, 60000);
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = raw; }
    if (!res.ok) throw new ApiError(`Neosoft Gemini returned HTTP ${res.status}`, { kind: 'api', status: res.status });
    const answer = extractText(data);
    if (!answer) {
      logger.warn('ai', 'Neosoft Gemini returned no recognizable text');
      throw new ApiError('AI API returned no usable text. Check the Neosoft endpoint response format.', { kind: 'bad_response' });
    }
    return answer;
  } catch (err) {
    logger.warn('ai', `Neosoft Gemini request failed: ${err.message}`);
    throw err;
  }
}
