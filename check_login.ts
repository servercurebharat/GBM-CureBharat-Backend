import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

import User from './src/models/User';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkLogin() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri as string);
    console.log('Connected to DB');

    const mobile = '9978944422';
    const password = '123456';
    const user = await User.findOne({ mobile }).lean() as any;

    if (!user) {
      console.log('User not found!');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.memberId})`);
    console.log(`Status: ${user.status}`);
    console.log(`Password Hash: ${user.password}`);

    let isVerified = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isVerified = await bcrypt.compare(password, user.password);
    } else {
      isVerified = user.password === password;
    }

    console.log(`Password Verified: ${isVerified}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkLogin();
