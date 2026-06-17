const axios = require('axios');
const cheerio = require('cheerio');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Business configuration
const MY_MERCHANT_NUMBER = '2519****6418';
const MERCHANT_NAMES = ['BIKILA', 'MELESE', 'BANTI'];
const TELEBIRR_RECEIPT_URL = 'https://transactioninfo.ethiotelecom.et/receipt';

// Netlify Function URL - Set this in Railway environment variables
// Example: TELEBIRR_PROXY_URL=https://mtmoviess.netlify.app/.netlify/functions/scrape
const TELEBIRR_PROXY_URL = process.env.TELEBIRR_PROXY_URL || null;

/**
 * Main payment verification controller
 * POST /api/payments/verify
 * Body: { transactionId, userId, expectedAmount, planName }
 */
exports.verifyPayment = async (req, res) => {
  const { transactionId, expectedAmount, planName } = req.body;
  const userId = req.user._id; // From auth middleware

  try {
    // Input validation
    if (!transactionId || !expectedAmount || !planName) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields: transactionId, expectedAmount, or planName'
      });
    }

    const normalizedTxId = transactionId.trim().toUpperCase();

    // Validation: Transaction ID format
    if (!/^[A-Z0-9]{6,20}$/.test(normalizedTxId)) {
      return res.status(400).json({
        success: false,
        message: '❌ Invalid transaction ID format. Please enter a valid Telebirr transaction ID.'
      });
    }

    // STEP 1: Duplicate Check (Anti-Fraud)
    console.log(`[Payment] Checking duplicate for transaction: ${normalizedTxId}`);
    const existingTransaction = await Transaction.findOne({ transactionId: normalizedTxId });
    
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: '❌ This transaction ID has already been verified and used.'
      });
    }

    // STEP 2: Fetch HTML from Telebirr (via Netlify Function)
    console.log(`[Payment] Fetching receipt for: ${normalizedTxId}`);
    let receiptHTML;
    
    try {
      if (!TELEBIRR_PROXY_URL) {
        throw new Error('TELEBIRR_PROXY_URL not configured. Please set it in Railway environment variables.');
      }

      console.log(`[Payment] Using Netlify Function: ${TELEBIRR_PROXY_URL}`);

      const response = await axios.post(TELEBIRR_PROXY_URL, {
        transactionId: normalizedTxId
      }, {
        timeout: 15000, // 15 seconds
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.html) {
        receiptHTML = response.data.html;
      } else {
        throw new Error('Invalid response from Netlify Function');
      }

      if (!receiptHTML || receiptHTML.length < 100) {
        throw new Error('Empty or invalid response from Telebirr');
      }

      console.log(`[Payment] Successfully fetched receipt (${receiptHTML.length} bytes)`);

    } catch (networkError) {
      console.error('[Payment] Network error:', networkError.message);
      
      if (networkError.code === 'ECONNABORTED' || networkError.code === 'ETIMEDOUT') {
        return res.status(400).json({
          success: false,
          message: '❌ Request timeout. Telebirr may be slow. Please try again.',
          code: 'NETWORK_TIMEOUT'
        });
      }

      if (networkError.response?.status === 502) {
        return res.status(400).json({
          success: false,
          message: '❌ Unable to reach Telebirr servers. Please try again later.',
          code: 'PROXY_ERROR'
        });
      }

      return res.status(400).json({
        success: false,
        message: '❌ Unable to verify payment. Please try again or contact support.',
        code: 'NETWORK_ERROR',
        details: networkError.message
      });
    }

    // STEP 3: HTML Parsing via Cheerio
    console.log(`[Payment] Parsing receipt HTML`);
    const $ = cheerio.load(receiptHTML);
    
    // Extract transaction status
    let status = '';
    $('td').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('የክፍያው ሁኔታ') || text.includes('transaction status')) {
        status = $(elem).next('td').text().trim();
      }
    });

    // Extract receiver account number
    let receiverAccount = '';
    $('td').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('የገንዘብ ተቀባይ ቴሌብር ቁ') || text.includes('Credited party account no')) {
        receiverAccount = $(elem).next('td').text().trim();
      }
    });

    // Extract receiver name
    let receiverName = '';
    $('td').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('የገንዘብ ተቀባይ ስም') || text.includes('Credited Party name')) {
        let nameText = $(elem).next('td').text().trim();
        // Remove any label tags
        nameText = nameText.replace(/<\/?label>/gi, '');
        receiverName = nameText;
      }
    });

    // Extract payer name
    let payerName = 'Unknown';
    $('td').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('የከፋይ ስም') || text.includes('Payer Name')) {
        payerName = $(elem).next('td').text().trim();
      }
    });

    // Extract payer number
    let payerNo = '';
    $('td').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('የከፋይ ቴሌብር ቁ') || text.includes('Payer telebirr no')) {
        payerNo = $(elem).next('td').text().trim();
      }
    });

    // Extract total amount (settled amount or total paid)
    let parsedAmount = 0;
    $('td').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('የተከፈለው መጠን') || text.includes('Settled Amount')) {
        const amountText = $(elem).next('td').text().trim();
        const cleanAmount = amountText.replace(/[^0-9.]/g, '');
        parsedAmount = parseFloat(cleanAmount) || 0;
      }
    });

    // If settled amount not found, try total paid amount
    if (parsedAmount === 0) {
      $('td').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.includes('ጠቅላላ የተከፈለ') || text.includes('Total Paid Amount')) {
          const amountText = $(elem).next('td').text().trim();
          const cleanAmount = amountText.replace(/[^0-9.]/g, '');
          parsedAmount = parseFloat(cleanAmount) || 0;
        }
      });
    }

    console.log(`[Payment] Parsed data:`, {
      status,
      receiverAccount,
      receiverName,
      payerName,
      parsedAmount
    });

    // STEP 4: Status Validation Check
    if (status.toLowerCase() !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '❌ Verification failed. This transaction is incomplete or pending.',
        details: { status: status || 'Unknown' }
      });
    }

    // STEP 5: Recipient Account Validation Check
    const isReceiverCorrect = 
      receiverAccount.includes(MY_MERCHANT_NUMBER.replace(/\*/g, '')) ||
      receiverAccount.includes('6418') ||
      MERCHANT_NAMES.some(name => receiverName.toUpperCase().includes(name));

    if (!isReceiverCorrect) {
      return res.status(400).json({
        success: false,
        message: '❌ Verification failed. This payment was sent to an incorrect business account.',
        details: { 
          receivedAccount: receiverAccount,
          expectedAccount: MY_MERCHANT_NUMBER 
        }
      });
    }

    // STEP 6: Balance Validation Checks
    if (parsedAmount === 0) {
      return res.status(400).json({
        success: false,
        message: '❌ Unable to read payment amount from receipt. Please contact support.',
        code: 'AMOUNT_PARSE_ERROR'
      });
    }

    let overpaymentCredit = 0;
    
    // Low balance case
    if (parsedAmount < expectedAmount) {
      return res.status(400).json({
        success: false,
        message: `❌ Insufficient balance. The service costs ${expectedAmount} Birr, but this receipt only verifies ${parsedAmount} Birr.`,
        details: {
          expected: expectedAmount,
          received: parsedAmount,
          shortage: expectedAmount - parsedAmount
        }
      });
    }

    // High balance case (overpayment)
    if (parsedAmount > expectedAmount) {
      overpaymentCredit = parsedAmount - expectedAmount;
      console.log(`[Payment] Overpayment detected: ${overpaymentCredit} Birr`);
    }

    // STEP 7: Database Persistence & Success Protocol
    console.log(`[Payment] Saving transaction to database`);
    
    const transaction = new Transaction({
      transactionId: normalizedTxId,
      userId: userId,
      payerName: payerName,
      payerNo: payerNo,
      amount: parsedAmount,
      expectedAmount: expectedAmount,
      overpayment: overpaymentCredit,
      planRequested: planName,
      status: 'completed'
    });

    await transaction.save();

    // Activate user's plan
    console.log(`[Payment] Activating plan for user: ${userId}`);
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '❌ User not found.'
      });
    }

    user.plan = planName.toLowerCase();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    user.planExpiresAt = expirationDate;
    
    // Credit overpayment if applicable
    if (overpaymentCredit > 0 && user.balance !== undefined) {
      user.balance = (user.balance || 0) + overpaymentCredit;
    }

    await user.save();

    console.log(`[Payment] Payment verified successfully for transaction: ${normalizedTxId}`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: '🎉 Payment verified successfully! Your service is now fully active.',
      data: {
        transactionId: normalizedTxId,
        amount: parsedAmount,
        plan: planName,
        expiresAt: expirationDate,
        overpaymentCredit: overpaymentCredit > 0 ? overpaymentCredit : undefined
      },
      user: {
        id: user._id,
        email: user.email,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('[Payment] Unexpected error:', error);
    
    return res.status(500).json({
      success: false,
      message: '❌ An unexpected error occurred during verification. Please try again or contact support.',
      code: 'INTERNAL_ERROR'
    });
  }
};
