const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { utils: { parseFromHTML } } = require('telebirr-receipt');

// Custom fetcher strictly for telebirr that isolates the connection
const fetchReceiptIsolated = (receiptNo) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'transactioninfo.ethiotelecom.et',
      port: 443,
      path: `/receipt/${receiptNo}`,
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 15s'));
    });

    req.on('error', (e) => {
      console.error('[Telebirr] HTTPS fetch error:', e.message, e.code);
      reject(e);
    });

    req.end();
  });
};

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

    // 2. Get receipt HTML — prefer what the mobile client fetched (Ethiopian IP, no geo-block)
    //    Fall back to server-side fetch if not provided.
    let htmlAsString;

    if (clientHtml && clientHtml.length > 100) {
      // Mobile app already fetched it from an Ethiopian IP — use it directly
      htmlAsString = clientHtml;
      console.log('[Payment] Using client-provided receipt HTML, length:', clientHtml.length);
    } else {
      // Try server-side fetch as fallback
      try {
        htmlAsString = await fetchReceiptIsolated(receiptNo);
        if (!htmlAsString || htmlAsString.length < 100) {
          throw new Error('Empty response from Telebirr');
        }
      } catch (e) {
        console.error('[Payment] Telebirr server-side fetch failed:', e.message, e.code);
        return res.status(400).json({ error: `Could not reach Telebirr to verify your receipt. Please check your internet connection and try again.` });
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
