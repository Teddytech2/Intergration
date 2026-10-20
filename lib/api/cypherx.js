// CypherX media API adapter. API responses vary slightly between endpoints,
// so normalize common result/data/download URL shapes in one place.
import { fetchWithTimeout } from '../utils/http.js';
import { ApiError, AppError } from '../utils/errors.js';

export const MEDIA_API = 'https://media.cypherxbot.space';

export function pickNode(data) {
  return data?.result ?? data?.data ?? data?.response ?? data;
}

export function findMediaUrl(node, keys = []) {
  const preferred = [...keys, 'download_url', 'downloadUrl', 'download', 'video_url', 'videoUrl',
    'audio_url', 'audioUrl', 'nowm', 'no_watermark', 'noWatermark', 'url', 'video', 'audio', 'media'];
  const seen = new Set();
  function walk(value, depth = 0) {
    if (!value || depth > 5) return null;
    if (typeof value === 'string') return /^https?:\/\//i.test(value) ? value : null;
    if (typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    for (const key of preferred) {
      const v = value[key];
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v;
    }
    for (const v of Object.values(value)) {
      const found = walk(v, depth + 1);
      if (found) return found;
    }
    return null;
  }
  return walk(node);
}

export async function cypherxJson(path, params = {}, timeoutMs = 60000) {
  const url = new URL(`${MEDIA_API}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const res = await fetchWithTimeout(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
  }, timeoutMs);
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new ApiError('CypherX returned an unexpected response', { kind: 'bad_response', status: res.status }); }
  if (!res.ok || data?.success === false || data?.status === false) {
    throw new ApiError(`CypherX request failed (HTTP ${res.status})`, {
      kind: res.status === 404 ? 'http' : 'api', status: res.status
    });
  }
  return data;
}

export function requireHttpUrl(url, label = 'download') {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new AppError(`No valid ${label} URL was returned by CypherX.`, { kind: 'bad_response' });
  }
  return url;
}
