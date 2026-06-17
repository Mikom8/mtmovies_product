const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Business configuration
const MY_MERCHANT_NUMBER = '0919516418';
const MERCHANT_NAMES = ['BIKILA', 'MELESE'];

/**
 * Submit payment for manual verification
 * POST /api/payments/submit
 */
exports.submitPayment = async (req, res) => {
  const { transactionId, expectedAmount, planName } = req.body;
  const userId = req.user._id;

  try {
    if (!transactionId || !expectedAmount || !planName) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields'
      });
    }

    const normalizedTxId = transactionId.trim().toUpperCase();

    if (!/^[A-Z0-9]{6,20}$/.test(normalizedTxId)) {
      return res.status(400).json({
        success: false,
        message: '❌ Invalid transaction ID format'
      });
    }

    // Check duplicate
    const existingTransaction = await Transaction.findOne({ transactionId: normalizedTxId });
    
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: '❌ This transaction ID has already been submitted'
      });
    }

    // Create pending transaction
    const transaction = new Transaction({
      transactionId: normalizedTxId,
      userId: userId,
      payerName: 'Pending Verification',
      payerNo: '',
      amount: parseFloat(expectedAmount),
      expectedAmount: parseFloat(expectedAmount),
      overpayment: 0,
      status: 'pending',
      planRequested: planName
    });

    await transaction.save();

    console.log(`[Payment] Pending transaction created: ${normalizedTxId}`);

    return res.status(200).json({
      success: true,
      message: '✅ Payment submitted! We will verify and activate your plan within 24 hours.',
      data: {
        transactionId: normalizedTxId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('[Payment] Error:', error);
    return res.status(500).json({
      success: false,
      message: '❌ An error occurred. Please try again.'
    });
  }
};
