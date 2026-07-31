import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const cfg = (Constants.expoConfig && Constants.expoConfig.extra) || (Constants.manifest && Constants.manifest.extra) || {};
const API_BASE_URL = cfg.API_BASE_URL || 'https://mtmoviesproduct-production.up.railway.app/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (process.env.EXPO_PUBLIC_API_KEY) {
    config.headers['x-api-key'] = process.env.EXPO_PUBLIC_API_KEY;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default client;
