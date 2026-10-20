// Social-media downloads via CypherX.
import { cypherxJson, pickNode, findMediaUrl, requireHttpUrl } from './cypherx.js';
import { AppError, ApiError } from '../utils/errors.js';
import { assertPublicHttpUrl } from '../utils/urlSafety.js';

export const IG_HOSTS = ['instagram.com', 'instagr.am'];
export const TIKTOK_HOSTS = ['tiktok.com', 'vm.tiktok.com'];
export async function validateSocialUrl(url, hosts) {
  try { return await assertPublicHttpUrl(url, { allowedHosts: hosts, resolveDns: false }); }
  catch { throw new AppError(`That doesn't look like a valid ${hosts[0].split('.')[0]} link.`, { kind: 'invalid_input' }); }
}
const isHttp = s => typeof s === 'string' && /^https?:\/\//i.test(s);
function collect(node, out, depth = 0) {
  if (!node || depth > 5) return;
  if (typeof node === 'string') { if (isHttp(node)) out.push({ url: node, type: /\.(jpe?g|png|webp)(\?|$)/i.test(node) ? 'image' : 'video' }); return; }
  if (Array.isArray(node)) { node.forEach(n => collect(n, out, depth + 1)); return; }
  if (typeof node === 'object') {
    const url = findMediaUrl(node, ['download_url','downloadUrl','download','video_url','videoUrl','nowm','no_watermark','noWatermark','image_url','imageUrl','url']);
    if (url) {
      const hint = String(node.type || node.media_type || '');
      out.push({ url, type: /image|photo/i.test(hint) || /\.(jpe?g|png|webp)(\?|$)/i.test(url) ? 'image' : 'video' });
      return;
    }
    for (const value of Object.values(node)) collect(value, out, depth + 1);
  }
}
export async function getTikTokMedia(url) {
  const safe = await validateSocialUrl(url, TIKTOK_HOSTS);
  const data = await cypherxJson('/download/tiktok/video', { url: safe }, 60000);
  const node = pickNode(data);
  const video = findMediaUrl(node, ['download_url','downloadUrl','download','video_url','videoUrl','video','nowm','no_watermark','noWatermark','url']);
  if (!video) throw new ApiError('No TikTok video URL in response', { kind: 'no_results' });
  return { url: requireHttpUrl(video, 'TikTok video'), title: node?.title || node?.desc || 'TikTok video' };
}
export async function getInstagramMedia(url) {
  const safe = await validateSocialUrl(url, IG_HOSTS);
  let data;
  // Try the documented legacy route first, then common CypherX route names.
  for (const endpoint of ['/download/instagram/igram', '/download/instagram/video']) {
    try { data = await cypherxJson(endpoint, { url: safe }, 60000); break; }
    catch (err) { if (err.status !== 404) throw err; }
  }
  if (!data) throw new ApiError('Instagram endpoint not found on CypherX', { kind: 'http', status: 404 });
  const found = [];
  collect(pickNode(data), found);
  const seen = new Set();
  const media = found.filter(m => !seen.has(m.url) && seen.add(m.url)).slice(0, 5);
  if (!media.length) throw new ApiError('No Instagram media found', { kind: 'no_results' });
  return media;
}
