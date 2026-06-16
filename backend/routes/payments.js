const express = require('express');
const router = express.Router();
const https = require('https');
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const { utils: { parseFromHTML } } = require('telebirr-receipt');

const RECEIPT_FETCH_ERROR =
  'Could not verify your Telebirr receipt. Check the transaction ID and try again in a moment.';

const fetchReceiptOnce = (receiptNo) =>
  new Promise((resolve, reject) => {
    const options = {
      hostname: 'transactioninfo.ethiotelecom.et',
      port: 443,
      path: `/receipt/${encodeURIComponent(receiptNo)}`,
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 20000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Connection: 'close',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        try {
          const nextUrl = new URL(res.headers.location, 'https://transactioninfo.ethiotelecom.et');
          const redirectReq = https.request(
            {
              hostname: nextUrl.hostname,
              port: nextUrl.port || 443,
              path: `${nextUrl.pathname}${nextUrl.search}`,
              method: 'GET',
              rejectUnauthorized: false,
              timeout: 20000,
              headers: options.headers,
            },
            (redirectRes) => {
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
            }
          );
          redirectReq.on('timeout', () => {
            redirectReq.destroy();
            reject(new Error('Request timed out'));
          });
          redirectReq.on('error', reject);
          redirectReq.end();
        } catch (e) {
          reject(e);
        }
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Telebirr returned HTTP ${res.statusCode}`));
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
      reject(new Error('Request timed out'));
    });
    req.on('error', reject);
    req.end();
  });

async function fetchReceiptIsolated(receiptNo, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetchReceiptOnce(receiptNo);
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  }
  throw lastError;
}

function parseAmount(value) {
  if (value == null || value === '') return null;
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseReceiptFallback(html) {
  const result = {};

  const invoiceRow = html.match(
    /receipttableTd2">\s*([A-Z0-9]+)\s*<\/td>\s*<td class="receipttableTd">\s*[\d\-:\s]+<\/td>\s*<td class="receipttableTd">\s*(\d+(?:\.\d+)?)\s*Birr/i
  );
  if (invoiceRow) {
    result.receiptNo = invoiceRow[1].trim().toUpperCase();
    result.settled_amount = invoiceRow[2];
  }

  const creditedName = html.match(
    /Credited Party name[\s\S]*?<td[^>]*>\s*([^<]+)/i
  );
  if (creditedName) {
    result.credited_party_name = creditedName[1].replace(/<\/?label>/gi, '').trim();
  }

  const creditedPhone = html.match(
    /Credited party account no[\s\S]*?<td[^>]*>\s*([\d*]+)/i
  );
  if (creditedPhone) {
    result.credited_party_acc_no = creditedPhone[1].trim();
  }

  const payerName = html.match(/Payer Name[\s\S]*?<td[^>]*>\s*([^<]+)/i);
  if (payerName) {
    result.payer_name = payerName[1].trim();
  }

  const statusMatch = html.match(
    /transaction status[\s\S]*?<td[^>]*>\s*([^<]+)/i
  );
  if (statusMatch) {
    result.status = statusMatch[1].trim();
  }

  return result;
}

function normalizeReceipt(parsed, html, receiptNo) {
  const fallback = parseReceiptFallback(html);
  const merged = { ...fallback, ...parsed };

  if (!merged.receiptNo) {
    merged.receiptNo = receiptNo.toUpperCase();
  }

  // Settled amount is what the merchant receives — use that for plan checks.
  const amount =
    parseAmount(merged.settled_amount) ??
    parseAmount(merged.total_amount) ??
    parseAmount(merged.amount);

  return {
    receiptNo: String(merged.receiptNo || receiptNo).trim().toUpperCase(),
    amount,
    payerName: merged.payer_name || merged.payerName || 'Unknown',
    receiverName: String(merged.credited_party_name || merged.creditedPartyName || '').toUpperCase(),
    receiverPhone: String(merged.credited_party_acc_no || merged.to || ''),
    status: String(merged.status || merged.transaction_status || '').toLowerCase(),
  };
}

router.post('/verify', protect, async (req, res) => {
  try {
    const { receiptNo, expectedAmount, planName } = req.body;

    if (!receiptNo || expectedAmount == null || !planName) {
      return res.status(400).json({ error: 'Missing receipt details.' });
    }

    const normalizedReceiptNo = String(receiptNo).trim().toUpperCase();
    if (!/^[A-Z0-9]{6,20}$/.test(normalizedReceiptNo)) {
      return res.status(400).json({ error: 'Invalid transaction ID format.' });
    }

    const existingTx = await Transaction.findOne({ receiptNo: normalizedReceiptNo });
    if (existingTx) {
      return res.status(400).json({ error: 'This transaction ID has already been used.' });
    }

    let htmlAsString;
    try {
      htmlAsString = await fetchReceiptIsolated(normalizedReceiptNo);
    } catch (e) {
      console.error('[Payment] Telebirr fetch failed:', e.message);
      return res.status(400).json({
        error: RECEIPT_FETCH_ERROR,
        code: 'RECEIPT_FETCH_FAILED',
      });
    }

    const parsedRaw = parseFromHTML(htmlAsString) || {};
    const receipt = normalizeReceipt(parsedRaw, htmlAsString, normalizedReceiptNo);

    console.log('[Payment] Parsed receipt:', JSON.stringify(receipt));

    if (receipt.receiptNo !== normalizedReceiptNo) {
      return res.status(400).json({ error: 'Receipt number does not match the transaction record.' });
    }

    if (receipt.status && receipt.status !== 'completed') {
      return res.status(400).json({ error: 'This transaction is not completed yet.' });
    }

    const isReceiverCorrect =
      receipt.receiverName.includes('BIKILA') ||
      receipt.receiverName.includes('MELESE') ||
      receipt.receiverPhone.includes('919516418') ||
      receipt.receiverPhone.includes('6418');

    if (!isReceiverCorrect) {
      return res.status(400).json({
        error: 'Transaction was not sent to the correct MT Movies account (BIKILA MELESE / 0919516418).',
      });
    }

    if (!receipt.amount) {
      return res.status(400).json({ error: 'Could not read transaction amount from receipt.' });
    }

    const expected = parseFloat(expectedAmount);
    if (receipt.amount < expected) {
      return res.status(400).json({
        error: `Insufficient amount. Expected ETB ${expected}, but receipt shows ETB ${receipt.amount}.`,
      });
    }

    const tx = new Transaction({
      receiptNo: normalizedReceiptNo,
      amount: receipt.amount,
      payerName: receipt.payerName,
      usedBy: req.user._id,
    });
    await tx.save();

    req.user.plan = planName.toLowerCase();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    req.user.planExpiresAt = expires;
    await req.user.save();

    const safeUser = { ...req.user._doc };
    delete safeUser.password;

    res.json({ message: 'Payment verified successfully!', user: safeUser });
  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again or contact support.' });
  }
});

module.exports = router;
