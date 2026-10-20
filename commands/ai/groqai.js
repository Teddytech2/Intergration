import { getAiReply } from '../../lib/aiApi.js';
import { react, reply, replyError, usage } from '../../lib/helpers/reply.js';

export default {
  name: 'groqai',
  alias: ['groq'],
  description: 'Ask the Neosoft Gemini AI endpoint. Usage: .groqai <question>',
  async execute(sock, msg, args, prefix) {
    const chatId = msg.key.remoteJid;
    if (!args.length) return reply(sock, msg, usage(prefix, 'groqai <question>', 'groqai explain black holes simply'));
    try {
      sock.sendPresenceUpdate('composing', chatId).catch(() => {});
      const text = await getAiReply(args.join(' '));
      await reply(sock, msg, text);
    } catch (err) {
      await replyError(sock, msg, err, 'groqai');
    } finally {
      sock.sendPresenceUpdate('paused', chatId).catch(() => {});
    }
  }
};
