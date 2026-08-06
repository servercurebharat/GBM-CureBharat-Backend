import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const User = require('./src/models/User').default;
  
  const users = await User.find({ name: { $regex: 'Neha|Kalyani|Himmat', $options: 'i' } });
  users.forEach((u: any) => console.log(`${u.name} (${u.memberId}) - Sponsor: ${u.sponsorId} - Parent: ${u.parentId}`));
  
  process.exit(0);
}

run().catch(console.error);
