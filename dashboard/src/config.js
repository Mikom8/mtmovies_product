export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://mtmoviesproduct-production.up.railway.app/api');

// Global fetch interceptor to inject API Key automatically
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  
  // Inject x-api-key if the request is targeting our backend
  if (url && (url.startsWith(API_BASE_URL) || url.includes('/api/'))) {
    init.headers = {
      ...init.headers,
      'x-api-key': import.meta.env.VITE_API_KEY
    };
  }
  
  return originalFetch(input, init);
};

