const express = require('express');
const https = require('https');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS for Railway backend
app.use(cors({
  origin: [
    'https://mtmoviesproduct-production.up.railway.app',
    'http://localhost:5000',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Telebirr Proxy Server',
    message: 'This proxy fetches Telebirr receipts for regions with restricted access'
  });
});

// Proxy endpoint to fetch Telebirr receipt
app.get('/fetch/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  
  console.log(`[Proxy] Fetching receipt for: ${transactionId}`);
  
  if (!transactionId || !/^[A-Z0-9]{6,20}$/i.test(transactionId)) {
    return res.status(400).json({
      error: 'Invalid transaction ID format'
    });
  }

  const normalizedTxId = transactionId.trim().toUpperCase();

  try {
    const htmlContent = await fetchTelebirrReceipt(normalizedTxId);
    
    // Return HTML content
    res.set('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error('[Proxy] Fetch error:', error.message);
    res.status(502).json({
      error: 'Failed to fetch receipt from Telebirr',
      details: error.message,
      transactionId: normalizedTxId
    });
  }
});

// Function to fetch receipt from Telebirr
function fetchTelebirrReceipt(transactionId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'transactioninfo.ethiotelecom.et',
      port: 443,
      path: `/receipt/${encodeURIComponent(transactionId)}`,
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    };

    const req = https.request(options, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        
        try {
          const nextUrl = new URL(response.headers.location, 'https://transactioninfo.ethiotelecom.et');
          
          const redirectReq = https.request({
            hostname: nextUrl.hostname,
            port: nextUrl.port || 443,
            path: `${nextUrl.pathname}${nextUrl.search}`,
            method: 'GET',
            rejectUnauthorized: false,
            timeout: 30000,
            headers: options.headers
          }, (redirectRes) => {
            let data = '';
            
            redirectRes.on('data', (chunk) => {
              data += chunk;
            });
            
            redirectRes.on('end', () => {
              if (redirectRes.statusCode >= 400) {
                reject(new Error(`Telebirr returned HTTP ${redirectRes.statusCode}`));
                return;
              }
              if (!data || data.length < 100) {
                reject(new Error('Empty response from Telebirr'));
                return;
              }
              resolve(data);
            });
          });
          
          redirectReq.on('timeout', () => {
            redirectReq.destroy();
            reject(new Error('Redirect request timed out'));
          });
          
          redirectReq.on('error', (err) => {
            reject(new Error(`Redirect request failed: ${err.message}`));
          });
          
          redirectReq.end();
        } catch (e) {
          reject(new Error(`Redirect processing failed: ${e.message}`));
        }
        return;
      }

      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode >= 400) {
          reject(new Error(`Telebirr returned HTTP ${response.statusCode}`));
          return;
        }
        if (!data || data.length < 100) {
          reject(new Error('Empty response from Telebirr'));
          return;
        }
        resolve(data);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 30 seconds'));
    });
    
    req.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });
    
    req.end();
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Telebirr Proxy Server running on port ${PORT}`);
  console.log(`📡 Ready to fetch receipts from Ethio Telecom`);
});
