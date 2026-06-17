const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payerName: {
    type: String,
    required: true
  },
  payerNo: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  expectedAmount: {
    type: Number,
    required: true
  },
  overpayment: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'completed'
  },
  planRequested: {
    type: String
  },
  processedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
