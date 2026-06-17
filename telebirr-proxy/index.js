// Simple proxy server to fetch Telebirr receipts
// Deploy this on a service that can access transactioninfo.ethiotelecom.et
// (e.g., Heroku, Render, or a VPS in Ethiopia)

const express = require('express');
const https = require('https');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your domains
app.use(cors({
  origin: [
    'https://mtmoviesproduct-production.up.railway.app',
    'https://mtmoviess.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Telebirr Proxy Server Running', timestamp: new Date().toISOString() });
});

// Fetch receipt from Telebirr
app.get('/fetch/:receiptNo', async (req, res) => {
  const { receiptNo } = req.params;
  
  if (!/^[A-Z0-9]{6,20}$/i.test(receiptNo)) {
    return res.status(400).json({ error: 'Invalid receipt number format' });
  }

  console.log(`[Proxy] Fetching receipt: ${receiptNo}`);

  try {
    const html = await fetchReceiptWithRetry(receiptNo, 3);
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error(`[Proxy] Error fetching ${receiptNo}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to fetch receipt from Telebirr',
      details: error.message 
    });
  }
});

// Fetch receipt with retries
async function fetchReceiptWithRetry(receiptNo, attempts = 3) {
  let lastError;
  
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`[Proxy] Attempt ${i + 1}/${attempts} for ${receiptNo}`);
      const html = await fetchReceiptOnce(receiptNo);
      console.log(`[Proxy] Success on attempt ${i + 1}`);
      return html;
    } catch (err) {
      lastError = err;
      console.log(`[Proxy] Attempt ${i + 1} failed:`, err.message);
      if (i < attempts - 1) {
        const delay = 1000 * (i + 1);
        console.log(`[Proxy] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Fetch receipt from Telebirr
function fetchReceiptOnce(receiptNo) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'transactioninfo.ethiotelecom.et',
      port: 443,
      path: `/receipt/${encodeURIComponent(receiptNo)}`,
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
    };

    const req = https.request(options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        if (!data || data.length < 100) {
          reject(new Error('Empty or invalid response'));
          return;
        }
        
        resolve(data);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });
    
    req.end();
  });
}

app.listen(PORT, () => {
  console.log(`[Proxy] Server running on port ${PORT}`);
  console.log(`[Proxy] Ready to fetch Telebirr receipts`);
});
