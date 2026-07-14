import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

import User from './src/models/User';

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixPunit() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env');

    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const mobile = '9978944422';
    const user = await User.findOne({ mobile });

    if (!user) {
      console.log('User not found!');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.memberId})`);
    
    // Set a known password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    user.password = hashedPassword;
    
    // Fix Invalid Date issue
    if (!user.joiningDate || isNaN(new Date(user.joiningDate).getTime())) {
      console.log('Fixing joining date...');
      user.joiningDate = new Date(); // Set to current date if missing
    }

    // Explicitly update using findByIdAndUpdate to avoid pre-save hook double hashing if there is a bug
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      joiningDate: user.joiningDate,
      status: 'active'
    });

    console.log('Successfully reset password to 123456 and fixed joining date.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fixPunit();
