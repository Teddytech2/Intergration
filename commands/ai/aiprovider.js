import { reply } from '../../lib/helpers/reply.js';

export default {
  name: 'aiprovider',
  alias: ['aistatus'],
  description: 'Show the configured text AI endpoint. Usage: .aiprovider',
  async execute(sock, msg) {
    await reply(sock, msg, '🤖 *AI Provider Status*\n\n✅ Neosoft Gemini\nhttps://api.neosoft.best/api/ai/gemini');
  }
};
