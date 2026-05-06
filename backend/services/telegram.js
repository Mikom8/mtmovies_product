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

let client = null;
try {
  if (apiId && apiHash) {
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
  }
} catch (e) {
  console.error("Failed to initialize TelegramClient:", e.message);
}

async function initTelegramClient() {
  if (!client || !apiId || !apiHash || !botToken) {
    console.warn('Telegram credentials missing or client failed to initialize, streaming disabled.');
    return;
  }

  try {
    await client.start({
      botAuthToken: botToken,
    });
    console.log('✅ Telegram client connected successfully.');
    
    // Save session to file so we don't need to re-authenticate
    fs.writeFileSync(sessionPath, client.session.save());
  } catch (err) {
    console.error('❌ Failed to start Telegram client:', err.message);
  }
}

module.exports = { client, initTelegramClient };
