require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./models/Movie');

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Check a few specific IDs from the watch history
  const testIds = [
    '69ffa2d6505a4ad875d878a7',  // movie
    '69ffa2d7505a4ad875d878ca',  // series (GoT?)
    '69ffa2d7505a4ad875d8791c',  // series
  ];
  
  for (const id of testIds) {
    const movie = await Movie.findById(id).select('title type duration seasons');
    if (movie) {
      console.log(`\nID: ${id}`);
      console.log(`  _id: ${movie._id}`);
      console.log(`  title: ${movie.title}`);
      console.log(`  type: ${movie.type}`);
      console.log(`  duration: "${movie.duration}"`);
      if (movie.seasons?.length > 0) {
        const s1 = movie.seasons[0];
        console.log(`  Season ${s1.seasonNumber}, Episode 1: duration="${s1.episodes[0]?.duration}"`);
      }
    } else {
      console.log(`\nID: ${id} — NOT FOUND`);
    }
  }
  
  // Also check what _id format the API returns
  const first3 = await Movie.find({}).limit(3).select('_id title type');
  console.log('\n--- First 3 movies from DB ---');
  first3.forEach(m => {
    console.log(`  _id: ${m._id} (type: ${typeof m._id}), title: ${m.title}`);
  });
  
  process.exit(0);
}
debug();
