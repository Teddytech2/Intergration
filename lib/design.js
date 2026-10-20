// ============================================================
//  TEDDY-XMD — shared text design.
//
//  ───  ❁ ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ ❁ ───
//
//   ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ @user
//
//    ❁ ᴘʀᴇғɪx  : .
//    ❁ ᴏᴡɴᴇʀ   : ...
//
//  ❁── LOGO  ──❁
//    ❁ ₁₉₁₇
//    ❁ ʙʟᴀᴄᴋᴘɪɴᴋ
//
//  > ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ
//
//  Pure functions, no imports: menus, welcome/goodbye messages and
//  small info panels all build their text from these pieces so the
//  whole bot looks the same.
// ============================================================

export const DEFAULT_BRAND = 'TEDDY-XMD ULTRA';

const SMALL_CAPS = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
  n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

// Brand helper: preserves the configured TEDDY-XMD ULTRA identity.
export const smallCaps = (text) => [...String(text ?? '')].map((c) => SMALL_CAPS[c.toLowerCase()] ?? c).join('');
// "1917" -> "₁₉₁₇"
export const subDigits = (text) => String(text ?? '').replace(/\d/g, (d) => SUB_DIGITS[Number(d)]);

export const cleanBrand = (brand) => String(brand || DEFAULT_BRAND).trim() || DEFAULT_BRAND;
// Remove only an explicit version suffix when present.
export const brandName = (brand) => cleanBrand(brand).replace(/\s+V\d+$/i, '');

const len = (s) => [...String(s)].length;

// ───  ❁ ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ ❁ ───
export const header = (brand) => `───  ❁ ${smallCaps(cleanBrand(brand))} ❁ ───`;
// ❁── LOGO  ──❁
export const section = (label) => `❁── ${label}  ──❁`;
// > ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ
export const footer = (brand) => `> ${smallCaps(cleanBrand(brand))}`;
//  ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ @user
export const welcomeLine = (brand, user) => ` ${smallCaps('welcome to')} ${smallCaps(brandName(brand))}${user ? ` ${user}` : ''}`;

// Aligned "  ❁ ʟᴀʙᴇʟ  : value" lines. Labels are padded to the widest one.
export function rows(pairs) {
  const list = pairs.filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!list.length) return '';
  const labels = list.map(([l]) => smallCaps(l));
  const width = Math.max(...labels.map(len));
  return list.map(([, v], i) => `  ❁ ${labels[i]}${' '.repeat(width - len(labels[i]))}: ${v}`).join('\n');
}
// "  ❁ ʙʟᴀᴄᴋᴘɪɴᴋ"
export const item = (name, suffix = '') => `  ❁ ${smallCaps(subDigits(name))}${suffix}`;

// Small info panel: header, one titled section, aligned rows and/or free lines, footer.
export function panel({ brand, title, pairs = [], lines = [], hint }) {
  const parts = [header(brand), ''];
  if (title) parts.push(section(String(title).toUpperCase()));
  const r = rows(pairs);
  if (r) parts.push(r);
  if (lines.length) parts.push(...lines.map((l) => `  ❁ ${l}`));
  if (hint) parts.push('', ` ${hint}`);
  parts.push('', footer(brand));
  return parts.join('\n');
}

// Wraps free text (an admin's own welcome/goodbye wording, a notice...) in the same frame.
export const framed = (brand, body) => `${header(brand)}\n\n${String(body).trim()}\n\n${footer(brand)}`;

// Welcome / goodbye messages. `custom` is the admin's own template with @user/@group/@count
// already substituted; when it is empty the default design is used.
export function renderWelcome({ brand, isJoin, custom, users, groupName, count, emoji }) {
  if (custom) return framed(brand, custom);
  const title = isJoin ? 'welcome' : 'goodbye';
  const lead = ` ${smallCaps(title)} ${users}${emoji ? ` ${emoji}` : ''}`;
  const info = rows([['Group', groupName || 'the group'], ['Members', count ? String(count) : '']]);
  return `${header(brand)}\n\n${lead}\n\n${info}\n\n${footer(brand)}`;
}
