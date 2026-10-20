/**
 * TEDDY-XMD ULTRA — Telegram WhatsApp pairing.
 * Uses the main TEDDY-XMD sessions server directly (/api/pair).
 * No SESSION_ID or separate session-generator is required.
 * Commands: /start, /pair <WhatsApp number>, /help
 */
import { config } from './config/index.js';

const TOKEN = config.telegram.botToken;
const PAIRING_API_URL = config.telegram.pairingApiUrl;
const API = `https://api.telegram.org/bot${TOKEN}`;

if (!TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN environment variable. Create a bot with @BotFather.');
  process.exit(1);
}

let offset = 0;
const accessByChat = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function telegram(method, body = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram API ${method} failed`);
  return data.result;
}

async function send(chatId, text) {
  return telegram('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
}

async function apiPost(path, body) {
  const response = await fetch(`${PAIRING_API_URL}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function pair(chatId, phoneInput) {
  const phone = String(phoneInput || '').replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 15) {
    await send(chatId, '⚠️ Enter a valid WhatsApp number with country code.\nExample: /pair 254712345678');
    return;
  }

  const accessToken = accessByChat.get(String(chatId));
  if (!accessToken) { await send(chatId, '🔒 Payment required: send /pay your-email@example.com, complete the KSh 30 Paystack checkout, then send /verify YOUR_PAYMENT_REFERENCE.'); return; }
  await send(chatId, '⏳ Connecting to TEDDY-XMD and requesting your WhatsApp pairing code. Please wait…');
  try {
    // The main sessions server creates the WhatsApp connection and returns the code.
    // The returned sessionId is deliberately not shown to the Telegram user.
    const response = await fetch(`${PAIRING_API_URL}/api/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone, accessToken }),
      signal: AbortSignal.timeout(55_000)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Pairing server returned HTTP ${response.status}`);
    }
    if (data.pairingCode) {
      accessByChat.delete(String(chatId));
      await send(chatId,
        `🔐 TEDDY-XMD ULTRA — WhatsApp Pairing\n\n` +
        `📱 Number: +${phone}\n` +
        `🔑 Pairing code: ${data.pairingCode}\n\n` +
        `On WhatsApp, open Settings → Linked devices → Link a device → Link with phone number, then enter this code.\n\n` +
        `⚠️ Keep this code private. Do not share it with anyone.`);
      return;
    }
    if (data.alreadyLinked) {
      await send(chatId, `✅ The WhatsApp number +${phone} is already connected to TEDDY-XMD.`);
      return;
    }
    throw new Error('The server did not return a pairing code. Check the TEDDY-XMD server logs and try again.');
  } catch (error) {
    const message = error.name === 'TimeoutError'
      ? 'Pairing took too long. Please try /pair again.'
      : (error.message || 'Unable to reach the pairing server.');
    await send(chatId, `❌ Pairing failed: ${message}\n\nMake sure the main TEDDY-XMD server is running and PAIRING_API_URL points to it.`);
  }
}

async function handle(update) {
  const message = update.message;
  if (!message?.chat?.id || typeof message.text !== 'string') return;
  const chatId = message.chat.id;
  const parts = message.text.trim().split(/\s+/);
  const command = (parts[0] || '').split('@')[0].toLowerCase();

  if (command === '/start' || command === '/help') {
    await send(chatId,
      '🤖 TEDDY-XMD ULTRA — WhatsApp Pairing\n\n' +
      '1) Pay KSh 30: /pay your-email@example.com\n' +
      '2) After checkout, verify: /verify YOUR_PAYMENT_REFERENCE\n' +
      '3) Pair WhatsApp: /pair 254712345678\n\n' +
      'One successful KSh 30 payment unlocks one pairing session. No session ID is needed.');
    return;
  }
  if (command === '/pay') {
    const email = parts[1] || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { await send(chatId, 'Enter your email for Paystack checkout. Example: /pay you@example.com'); return; }
    try { const checkout = await apiPost('/api/payments/initialize', { email }); await send(chatId, `💳 TEDDY-XMD ULTRA access — KSh 30\n\nComplete payment here:\n${checkout.authorizationUrl}\n\nAfter payment, copy the Paystack reference and send /verify REFERENCE.`); }
    catch (e) { await send(chatId, `❌ Could not start payment: ${e.message}`); }
    return;
  }
  if (command === '/verify') {
    const reference = parts[1] || '';
    if (!reference) { await send(chatId, 'Send /verify YOUR_PAYSTACK_REFERENCE after completing checkout.'); return; }
    try { const result = await apiPost('/api/payments/verify', { reference }); accessByChat.set(String(chatId), result.accessToken); await send(chatId, '✅ Payment verified! You can now send /pair 254712345678 to request one pairing code.'); }
    catch (e) { await send(chatId, `❌ Payment verification failed: ${e.message}`); }
    return;
  }
  if (command === '/pair' || command === '/pairing') {
    await pair(chatId, parts.slice(1).join(''));
    return;
  }
  await send(chatId, 'Unknown command. Use /start, /pay email@example.com, /verify REFERENCE, or /pair 254712345678.');
}

async function main() {
  try {
    const me = await telegram('getMe');
    console.log(`TEDDY-XMD Telegram pairing bot running as @${me.username}`);
    console.log(`Pairing API: ${PAIRING_API_URL}`);
  } catch (error) {
    console.error('Telegram bot startup failed:', error.message);
    process.exit(1);
  }

  while (true) {
    try {
      const updates = await telegram('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
      for (const update of updates) {
        offset = update.update_id + 1;
        try { await handle(update); }
        catch (error) { console.error('Update handler error:', error.message); }
      }
    } catch (error) {
      console.error('Telegram polling error:', error.message);
      await sleep(3000);
    }
  }
}

main();
