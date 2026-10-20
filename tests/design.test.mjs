import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeSock, fakeMsg, realCtx } from './helpers.mjs';
import { smallCaps, subDigits, header, footer, section, rows, renderWelcome } from '../lib/design.js';
import { wrapSendMessageWithContext, withDefaultContext } from '../lib/helpers/contextInfo.js';
import { handleWelcomeGoodbye } from '../lib/groupProtection.js';
import { setGroupSetting } from '../lib/settingsStore.js';
import repo from '../commands/tools/repo.js';
import { config } from '../config/index.js';

test('design helpers match the TEDDY-XMD ULTRA example exactly', () => {
  assert.equal(header('TEDDY-XMD ULTRA'), '───  ❁ ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ ❁ ───');
  assert.equal(footer('TEDDY-XMD ULTRA'), '> ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ');
  assert.equal(section('LOGO'), '❁── LOGO  ──❁');
  assert.equal(subDigits('1917'), '₁₉₁₇');
  assert.equal(smallCaps('blackpink'), 'ʙʟᴀᴄᴋᴘɪɴᴋ');
  assert.equal(rows([['Prefix', '.'], ['Platform', 'x']]), '  ❁ ᴘʀᴇғɪx  : .\n  ❁ ᴘʟᴀᴛғᴏʀᴍ: x');
});

test('welcome and goodbye use the design; an admin custom text is framed', () => {
  const w = renderWelcome({ brand: 'TEDDY-XMD ULTRA', isJoin: true, users: '@1', groupName: 'Squad', count: 12, emoji: '🎉' });
  assert.match(w, /^───  ❁ ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ ❁ ───/);
  assert.ok(w.includes('ᴡᴇʟᴄᴏᴍᴇ @1 🎉') && w.includes('❁ ɢʀᴏᴜᴘ  : Squad') && w.includes('❁ ᴍᴇᴍʙᴇʀs: 12'));
  assert.ok(w.endsWith('> ᴛᴇᴅᴅʏ-xᴍᴅ ᴜʟᴛʀᴀ'));
  const g = renderWelcome({ brand: 'TEDDY-XMD ULTRA', isJoin: false, users: '@1', groupName: 'Squad', count: 11, emoji: '👋' });
  assert.ok(g.includes('ɢᴏᴏᴅʙʏᴇ @1 👋'));
  const c = renderWelcome({ brand: 'TEDDY-XMD ULTRA', isJoin: true, custom: 'Hi there', users: '@1' });
  assert.ok(c.includes('\n\nHi there\n\n') && c.startsWith('───') && c.endsWith('ᴜʟᴛʀᴀ'));
});

test('group join/leave events send the designed message with mentions and contextInfo', async () => {
  const sock = fakeSock();
  sock.groupMetadata = async () => ({ subject: 'Squad', participants: [{}, {}, {}] });
  wrapSendMessageWithContext(sock);
  const gid = '1203630000@g.us';
  setGroupSetting(gid, 'welcome', true); setGroupSetting(gid, 'goodbye', true);
  await handleWelcomeGoodbye(sock, { id: gid, action: 'add', participants: ['2250700000000@s.whatsapp.net'] }, () => ({}));
  await handleWelcomeGoodbye(sock, { id: gid, action: 'remove', participants: ['2250700000000@s.whatsapp.net'] }, () => ({}));
  assert.equal(sock.sent.length, 2);
  for (const s of sock.sent) {
    assert.match(s.content.text, /^───  ❁ /);
    assert.ok(s.content.contextInfo.forwardedNewsletterMessageInfo.newsletterJid.endsWith('@newsletter'));
  }
  assert.ok(sock.sent[0].content.text.includes('ᴡᴇʟᴄᴏᴍᴇ') && sock.sent[1].content.text.includes('ɢᴏᴏᴅʙʏᴇ'));
});

test('contextInfo is added to every text/media send, merged, and skipped for reactions/status', async () => {
  const sock = fakeSock(); wrapSendMessageWithContext(sock);
  await sock.sendMessage('1@s.whatsapp.net', { text: 'hi', mentions: ['2@s.whatsapp.net'] });
  await sock.sendMessage('1@s.whatsapp.net', { image: { url: 'x' }, caption: 'c' });
  await sock.sendMessage('1@s.whatsapp.net', { text: 'own', contextInfo: { externalAdReply: { title: 'mine' }, isForwarded: false } });
  await sock.sendMessage('1@s.whatsapp.net', { react: { text: '❤️', key: {} } });
  await sock.sendMessage('status@broadcast', { text: 'st' });
  const [a, b, c, d, e] = sock.sent.map((s) => s.content);
  assert.ok(a.contextInfo.forwardedNewsletterMessageInfo && a.contextInfo.externalAdReply.sourceUrl === config.repoUrl && a.mentions.length === 1);
  assert.ok(b.contextInfo.forwardedNewsletterMessageInfo);
  assert.equal(c.contextInfo.externalAdReply.title, 'mine');
  assert.equal(c.contextInfo.isForwarded, false);
  assert.ok(c.contextInfo.forwardedNewsletterMessageInfo);
  assert.equal(d.contextInfo, undefined);
  assert.equal(e.contextInfo, undefined);
  assert.equal(withDefaultContext('1@s.whatsapp.net', null), null);
});

test('.repo uses the TEDDY-XMD repository link', async () => {
  assert.equal(config.repoUrl, 'https://github.com/Teddyxmd/TEDDY-XMD');
  const { ctx } = await realCtx();
  const sock = fakeSock();
  await repo.execute(sock, fakeMsg('.repo'), [], '.', ctx);
  const c = sock.sent[0].content;
  assert.ok(c.text.includes('https://github.com/Teddyxmd/TEDDY-XMD'));
  assert.ok(/github\.com\/Teddyxmd\/TEDDY-XMD/i.test(c.text));
  assert.equal(c.contextInfo.externalAdReply.sourceUrl, 'https://github.com/Teddyxmd/TEDDY-XMD');
});
