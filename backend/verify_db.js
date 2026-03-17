
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function verify() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@')); // Hide password
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    const userCount = await User.countDocuments();
    console.log(`✅ User count in database: ${userCount}`);

    if (userCount === 0) {
      console.warn('⚠️ No users found in the database. This might be why the app seems disconnected or empty.');
    } else {
      const sampleUser = await User.findOne().select('name email role');
      console.log('✅ Sample user found:', sampleUser);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB verification failed:');
    console.error(err);
    process.exit(1);
  }
}

verify();
