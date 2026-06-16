const express = require('express');
const router = express.Router();
const https = require('https');
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { utils: { parseFromHTML } } = require('telebirr-receipt');

// Custom fetcher strictly for telebirr that isolates the connection
const fetchReceiptIsolated = (receiptNo, redirectCount = 0) => {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects from Telebirr'));
      return;
    }

    const options = {
      hostname: 'transactioninfo.ethiotelecom.et',
      port: 443,
      path: `/receipt/${encodeURIComponent(receiptNo)}`,
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'close',
      }
    };

    const req = https.request(options, (res) => {
      const { statusCode, headers } = res;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        try {
          const nextUrl = new URL(headers.location, 'https://transactioninfo.ethiotelecom.et');
          const nextOptions = {
            hostname: nextUrl.hostname,
            port: nextUrl.port || 443,
            path: `${nextUrl.pathname}${nextUrl.search}`,
            method: 'GET',
            rejectUnauthorized: false,
            timeout: 20000,
            headers: options.headers,
          };
          const redirectReq = https.request(nextOptions, (redirectRes) => {
            let data = '';
            redirectRes.on('data', (chunk) => { data += chunk; });
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
            reject(new Error('Request timed out after 20s'));
          });
          redirectReq.on('error', reject);
          redirectReq.end();
        } catch (e) {
          reject(e);
        }
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (statusCode >= 400) {
          reject(new Error(`Telebirr returned HTTP ${statusCode}`));
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
      reject(new Error('Request timed out after 20s'));
    });

    req.on('error', (e) => {
      console.error('[Telebirr] HTTPS fetch error:', e.message, e.code);
      reject(e);
    });

    req.end();
  });
};

const RECEIPT_FETCH_ERROR = 'Could not load your Telebirr receipt automatically. Open the receipt link, view page source (Ctrl+U), copy all HTML, and paste it below.';

router.get('/receipt/:receiptNo', protect, async (req, res) => {
  const receiptNo = String(req.params.receiptNo || '').trim().toUpperCase();
  if (!receiptNo) {
    return res.status(400).json({ error: 'Receipt number is required.' });
  }

  try {
    const html = await fetchReceiptIsolated(receiptNo);
    return res.json({ html });
  } catch (e) {
    console.error('[Payment] Receipt preview fetch failed:', e.message);
    return res.status(502).json({
      error: RECEIPT_FETCH_ERROR,
      code: 'RECEIPT_FETCH_FAILED',
    });
  }
});

router.post('/verify', protect, async (req, res) => {
  try {
    const { receiptNo, expectedAmount, planName, receiptHtml: clientHtml } = req.body;

    if (!receiptNo || !expectedAmount || !planName) {
      return res.status(400).json({ error: 'Missing receipt details.' });
    }

    // 1. Check if receipt is already used in DB
    const existingTx = await Transaction.findOne({ receiptNo });
    if (existingTx) {
      return res.status(400).json({ error: 'This transaction ID has already been used.' });
    }

    // 2. Get receipt HTML — prefer what the mobile/browser client fetched (Ethiopian IP)
    let htmlAsString;

    // Debug — always log what came in
    console.log('[Payment] clientHtml received:', clientHtml ? `${clientHtml.length} chars` : 'null/undefined');

    if (clientHtml && clientHtml.length > 100) {
      // Client already fetched it from an Ethiopian IP — use it directly
      htmlAsString = clientHtml;
      console.log('[Payment] Using client-provided receipt HTML');
    } else {
      // Try server-side fetch as fallback
      try {
        htmlAsString = await fetchReceiptIsolated(receiptNo);
        if (!htmlAsString || htmlAsString.length < 100) {
          throw new Error('Empty response from Telebirr');
        }
      } catch (e) {
        console.error('[Payment] Telebirr server-side fetch failed:', e.message, e.code);
        return res.status(400).json({
          error: RECEIPT_FETCH_ERROR,
          code: 'RECEIPT_FETCH_FAILED',
        });
      }
    }

    const parsed = parseFromHTML(htmlAsString);
    console.log('[Payment] Parsed receipt fields:', JSON.stringify(parsed));

    // Validate that the parsed receipt number matches what was submitted
    if (parsed.receiptNo && parsed.receiptNo.toUpperCase() !== receiptNo.toUpperCase()) {
      return res.status(400).json({ error: 'Receipt number does not match the transaction record.' });
    }

    // Telebirr receipts might have empty 'total_amount' or 'settled_amount' or amount.
    const amount = parsed.total_amount || parsed.settled_amount || parsed.amount;

    // The receiver can be in 'credited_party_name', 'credited_party_acc_no', or 'to'
    const receiverName = (parsed.credited_party_name || '').toUpperCase();
    const receiverPhone = (parsed.credited_party_acc_no || parsed.to || '');

    // Flexible matching for the specific account
    const isReceiverCorrect = receiverName.includes('BIKILA') || receiverName.includes('MELESE') || receiverPhone.includes('919516418');

    if (!amount) {
      return res.status(400).json({ error: 'Could not read transaction amount from receipt.' });
    }

    if (!isReceiverCorrect) {
      return res.status(400).json({ error: 'Transaction was not sent to the correct MT Movies account (BIKILA MELESE / 0919516418).' });
    }

    const numericAmount = parseFloat(amount);
    const expected = parseFloat(expectedAmount);

    if (numericAmount < expected) {
      return res.status(400).json({ error: `Insufficient amount. Expected ETB ${expected}, but receipt shows ETB ${numericAmount}.` });
    }

    // 3. Mark as used
    const tx = new Transaction({
      receiptNo,
      amount: numericAmount,
      payerName: parsed.payer_name || 'Unknown',
      usedBy: req.user._id
    });
    await tx.save();

    // 4. Update user's plan
    req.user.plan = planName.toLowerCase();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    req.user.planExpiresAt = expires;

    await req.user.save();

    // Remove sensitive data before sending user back
    const safeUser = { ...req.user._doc };
    delete safeUser.password;

    res.json({ message: 'Payment verified successfully!', user: safeUser });

  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again or contact support.' });
  }
});

module.exports = router;
