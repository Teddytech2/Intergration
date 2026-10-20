export default {
  name: 'community',
  alias: ['support'],
  description: "Get the link to join the bot's support/community group. Usage: .community",
  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;
    const text = `👥 *Community Group*\n\nhttps://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8\n\nJoin for support and updates.`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
  }
};
