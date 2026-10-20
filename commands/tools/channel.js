export default {
  name: 'channel',
  alias: ['newsletter'],
  description: "Get the link to the bot's official WhatsApp channel. Usage: .channel",
  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;
    const text = `📢 *Official Channel*\n\nhttps://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n\n\nFollow for updates.`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
  }
};
