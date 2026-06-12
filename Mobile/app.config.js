const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      EXPO_GOOGLE_CLIENT_ID: process.env.EXPO_GOOGLE_CLIENT_ID || '',
      IOS_GOOGLE_CLIENT_ID: process.env.IOS_GOOGLE_CLIENT_ID || '',
      ANDROID_GOOGLE_CLIENT_ID: process.env.ANDROID_GOOGLE_CLIENT_ID || '',
      WEB_GOOGLE_CLIENT_ID: process.env.WEB_GOOGLE_CLIENT_ID || '',
      API_BASE_URL: process.env.API_BASE_URL || (process.env.EAS_BUILD === 'true' ? 'https://mtmoviesproduct-production.up.railway.app/api' : `http://${getLocalIp()}:5000/api`),
      eas: {
        projectId: "fdadf6fd-60cc-49ca-9408-78d4ca38bede"
      }
    },
    plugins: [
      "expo-font",
      "expo-video"
    ],
  };
};
