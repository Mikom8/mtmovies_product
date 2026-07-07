const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

// We will store all successfully initialized bot clients here
const clients = [];

// A default primary client for general helper calls (like getMessages)
let primaryClient = null;

async function initTelegramClient() {
  if (!apiId || !apiHash) {
    console.warn('Telegram API ID/HASH missing. Streaming/bot services disabled.');
    return;
  }

  // Define the bot tokens we want to look for
  const botTokens = [];
  if (process.env.TELEGRAM_BOT_TOKEN) {
    botTokens.push({ token: process.env.TELEGRAM_BOT_TOKEN, name: 'primary', suffix: '' });
  }
  if (process.env.TELEGRAM_BOT_TOKEN_1) {
    botTokens.push({ token: process.env.TELEGRAM_BOT_TOKEN_1, name: 'bot_1', suffix: '-1' });
  }
  if (process.env.TELEGRAM_BOT_TOKEN_2) {
    botTokens.push({ token: process.env.TELEGRAM_BOT_TOKEN_2, name: 'bot_2', suffix: '-2' });
  }

  if (botTokens.length === 0) {
    console.warn('No Telegram Bot Tokens configured.');
    return;
  }

  console.log(`[Telegram] Starting initialization of ${botTokens.length} bot client(s)...`);

  for (const bot of botTokens) {
    try {
      const sessionPath = path.join(__dirname, `../telegram-session${bot.suffix}.txt`);
      let sessionString = '';
      if (fs.existsSync(sessionPath)) {
        sessionString = fs.readFileSync(sessionPath, 'utf8');
      }
      
      const stringSession = new StringSession(sessionString);
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });

      await client.start({
        botAuthToken: bot.token,
      });

      // Save session file
      fs.writeFileSync(sessionPath, client.session.save());
      clients.push(client);
      
      if (!primaryClient) {
        primaryClient = client;
      }
      
      console.log(`✅ Telegram bot client (${bot.name}) connected successfully.`);
    } catch (err) {
      console.error(`❌ Failed to start Telegram bot client (${bot.name}):`, err.message);
    }
  }

  console.log(`[Telegram] Active bot pool size: ${clients.length} client(s).`);
}

let lastIndex = 0;
function getStreamingClient() {
  if (clients.length === 0) {
    return primaryClient; // fallback to primary if any
  }
  const client = clients[lastIndex];
  lastIndex = (lastIndex + 1) % clients.length;
  return client;
}

module.exports = {
  get client() { return primaryClient; },
  initTelegramClient,
  getStreamingClient
};
