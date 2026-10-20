export default {
  name: 'sensei',
  description: 'Learn a little about Teddy Tech, the dev behind the bot. Usage: .sensei',
  async execute(sock, msg, args, currentPrefix, ctx) {
    const chatId = msg.key.remoteJid;
    const text = `🌑 *Who is Teddy Tech?*\n\nTeddy Tech is the name behind ${ctx.BOT_NAME} — built for group management, utility, and a bit of fun. Always watching from the shadows, always online. ⚡`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
  }
};
