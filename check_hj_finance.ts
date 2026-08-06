import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const User = require('./src/models/user.model').default;
  const users = await User.find({ sponsorId: 'CB-HCM-1001' });
  console.log("Users under HJ Finance:");
  users.forEach((u: any) => console.log(`${u.name} - ${u.memberId}`));
  process.exit(0);
}

run().catch(console.error);
