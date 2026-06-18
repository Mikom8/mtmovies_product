const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in env');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected.');

    const db = mongoose.connection.db;
    const collection = db.collection('transactions');

    console.log('Retrieving indexes on transactions collection...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    const receiptNoIndex = indexes.find(idx => idx.name === 'receiptNo_1');
    if (receiptNoIndex) {
      console.log('Found receiptNo_1 index. Dropping it...');
      await collection.dropIndex('receiptNo_1');
      console.log('✅ Index receiptNo_1 dropped successfully!');
    } else {
      console.log('ℹ️ Index receiptNo_1 not found on transactions collection.');
    }

  } catch (error) {
    console.error('❌ Error occurred:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

run();
