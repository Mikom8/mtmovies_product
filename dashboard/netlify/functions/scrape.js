const axios = require('axios');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Extract transactionId from request body
    const body = JSON.parse(event.body || '{}');
    const { transactionId } = body;

    if (!transactionId || !transactionId.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing transactionId parameter' })
      };
    }

    const normalizedTxId = transactionId.trim().toUpperCase();

    // Validate format
    if (!/^[A-Z0-9]{6,20}$/.test(normalizedTxId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid transaction ID format' })
      };
    }

    console.log(`[Netlify Function] Fetching receipt for: ${normalizedTxId}`);

    // Fetch from Telebirr
    const response = await axios.get(
      `https://transactioninfo.ethiotelecom.et/receipt/${encodeURIComponent(normalizedTxId)}`,
      {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    );

    // Return HTML content
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        html: response.data,
        transactionId: normalizedTxId
      })
    };

  } catch (error) {
    console.error('[Netlify Function] Error:', error.message);

    let errorMessage = 'Failed to fetch receipt from Telebirr';
    let statusCode = 500;

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timed out after 12 seconds';
      statusCode = 504;
    } else if (error.response) {
      errorMessage = `Telebirr returned HTTP ${error.response.status}`;
      statusCode = 502;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message
      })
    };
  }
};
