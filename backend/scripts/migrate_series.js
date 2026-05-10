const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Series = require('../models/Series');

async function migrate() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Find all documents in 'movies' collection that have type: 'series'
    // Since we removed 'type' from the Movie schema, we might need to bypass mongoose schema strictness
    // or rely on the fact that Mongoose will still load the data if we do lean()
    const seriesToMigrate = await mongoose.connection.collection('movies').find({ type: 'series' }).toArray();
    
    console.log(`Found ${seriesToMigrate.length} series to migrate.`);

    if (seriesToMigrate.length > 0) {
      // 2. Insert into 'series' collection
      // Remove the 'type' field from each document before inserting
      const sanitizedSeries = seriesToMigrate.map(s => {
        delete s.type;
        return s;
      });

      const result = await Series.insertMany(sanitizedSeries);
      console.log(`✅ Successfully inserted ${result.length} series into the 'series' collection.`);

      // 3. Delete from 'movies' collection
      const seriesIds = seriesToMigrate.map(s => s._id);
      const deleteResult = await mongoose.connection.collection('movies').deleteMany({ _id: { $in: seriesIds } });
      console.log(`✅ Successfully deleted ${deleteResult.deletedCount} series from the 'movies' collection.`);
    } else {
      console.log('No series found to migrate. Perhaps they are already migrated?');
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
