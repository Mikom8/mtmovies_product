const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const sessionPath = path.join(__dirname, '../telegram-session.txt');

let sessionString = '';
if (fs.existsSync(sessionPath)) {
  sessionString = fs.readFileSync(sessionPath, 'utf8');
}
const stringSession = new StringSession(sessionString);

// Create primary client synchronously just like original code so destructuring doesn't get null
let client = null;
try {
  if (apiId && apiHash && botToken) {
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
  }
} catch (e) {
  console.error("Failed to initialize primary TelegramClient:", e.message);
}

// Active client pool for streaming
const clients = [];

async function initTelegramClient() {
  if (!apiId || !apiHash) {
    console.warn('Telegram API ID/HASH missing. Streaming/bot services disabled.');
    return;
  }

  // 1. Initialize primary client
  if (client && botToken) {
    try {
      await client.start({ botAuthToken: botToken });
      fs.writeFileSync(sessionPath, client.session.save());
      clients.push(client);
      console.log('✅ Telegram bot client (primary) connected successfully.');
    } catch (err) {
      console.error('❌ Failed to start primary Telegram client:', err.message);
    }
  }

  // 2. Initialize secondary clients
  const additionalBots = [
    { token: process.env.TELEGRAM_BOT_TOKEN_1, name: 'bot_1', suffix: '-1' },
    { token: process.env.TELEGRAM_BOT_TOKEN_2, name: 'bot_2', suffix: '-2' }
  ];

  for (const bot of additionalBots) {
    if (!bot.token) continue;
    try {
      const botSessionPath = path.join(__dirname, `../telegram-session${bot.suffix}.txt`);
      let botSessionString = '';
      if (fs.existsSync(botSessionPath)) {
        botSessionString = fs.readFileSync(botSessionPath, 'utf8');
      }
      
      const botStringSession = new StringSession(botSessionString);
      const botClient = new TelegramClient(botStringSession, apiId, apiHash, {
        connectionRetries: 5,
      });

      await botClient.start({ botAuthToken: bot.token });
      fs.writeFileSync(botSessionPath, botClient.session.save());
      clients.push(botClient);
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
    return client; // Fallback to primary client
  }
  const selected = clients[lastIndex];
  lastIndex = (lastIndex + 1) % clients.length;
  return selected;
}

module.exports = {
  client,
  initTelegramClient,
  getStreamingClient
};
