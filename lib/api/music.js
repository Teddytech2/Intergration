// YouTube search and audio downloads via CypherX.
import { cypherxJson, pickNode, findMediaUrl, requireHttpUrl } from './cypherx.js';
import { extractList, firstString, firstValue, pickResult } from './normalize.js';
import { AppError, ApiError } from '../utils/errors.js';
import { parseDurationToSeconds, formatClock } from '../utils/format.js';
import { config } from '../../config/index.js';

const YT_ID = /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([\w-]{11})/;
const BARE_ID = /^[\w-]{11}$/;
export function extractVideoId(input) {
  const s = String(input || '').trim();
  const m = s.match(YT_ID);
  if (m) return m[1];
  return BARE_ID.test(s) ? s : null;
}
export function normalizeTrack(item) {
  if (!item || typeof item !== 'object') return null;
  const url = firstString(item, ['url', 'link', 'videoUrl', 'video_url', 'webpage_url', 'original_url']);
  const id = firstString(item, ['id', 'videoId', 'video_id', 'vid', 'v']) || (url && extractVideoId(url)) || null;
  if (!id) return null;
  const author = item.author ?? item.channel ?? item.uploader ?? item.artist ?? item.channelTitle;
  const artist = typeof author === 'string' ? author : author?.name || author?.title || undefined;
  const rawDuration = firstValue(item, ['seconds', 'duration_seconds', 'timestamp', 'duration', 'duration_formatted', 'length']);
  const durationSeconds = parseDurationToSeconds(rawDuration?.seconds ?? rawDuration);
  let thumbnail = firstString(item, ['thumbnail', 'thumb', 'image', 'cover', 'thumbnailUrl', 'thumbnail_url']);
  if (!thumbnail && Array.isArray(item.thumbnails)) thumbnail = item.thumbnails.map(t => typeof t === 'string' ? t : t?.url).find(Boolean);
  return { id, title: firstString(item, ['title', 'name']) || 'Unknown title', artist, durationSeconds,
    duration: durationSeconds != null ? formatClock(durationSeconds) : (typeof rawDuration === 'string' ? rawDuration : undefined),
    thumbnail: thumbnail && /^https?:\/\//i.test(thumbnail) ? thumbnail : undefined,
    url: url || `https://www.youtube.com/watch?v=${id}` };
}
export async function searchTracks(query, { limit = 5 } = {}) {
  const q = String(query || '').replace(/[\u0000-\u001f]/g, ' ').trim();
  if (!q) throw new AppError('Please type a song name.', { kind: 'invalid_input' });
  if (q.length > 120) throw new AppError('That search is too long (max 120 characters).', { kind: 'invalid_input' });
  const data = await cypherxJson('/search/youtube', { query: q, media_type: 'audio', max_results: limit });
  let node = pickNode(data);
  let list = extractList(node);
  if (!list.length) list = extractList(data);
  if (!list.length) {
    const single = pickResult(node) || node;
    if (single && typeof single === 'object' && !Array.isArray(single)) list = [single];
  }
  const tracks = list.map(normalizeTrack).filter(Boolean).slice(0, limit);
  if (!tracks.length) throw new AppError('No results', { kind: 'no_results' });
  return tracks;
}
export async function getTrackDownload(id) {
  const vid = extractVideoId(id);
  if (!vid) throw new AppError('That is not a valid YouTube video id or link.', { kind: 'invalid_input' });
  const videoUrl = `https://www.youtube.com/watch?v=${vid}`;
  const data = await cypherxJson('/download/youtube/audio', { url: videoUrl }, 60000);
  const node = pickNode(data);
  const url = findMediaUrl(node, ['download_url', 'downloadUrl', 'download', 'audio_url', 'audioUrl', 'url']);
  return { url: requireHttpUrl(url, 'audio download'), title: node?.title, thumbnail: node?.thumbnail };
}
export const maxAudioSeconds = () => config.limits.maxAudioMinutes * 60;
