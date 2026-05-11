const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      EXPO_GOOGLE_CLIENT_ID: process.env.EXPO_GOOGLE_CLIENT_ID || '',
      IOS_GOOGLE_CLIENT_ID: process.env.IOS_GOOGLE_CLIENT_ID || '',
      ANDROID_GOOGLE_CLIENT_ID: process.env.ANDROID_GOOGLE_CLIENT_ID || '',
      WEB_GOOGLE_CLIENT_ID: process.env.WEB_GOOGLE_CLIENT_ID || '',
      API_BASE_URL: process.env.API_BASE_URL || 'https://mtmovies-production.up.railway.app/api',
    },
  };
};
