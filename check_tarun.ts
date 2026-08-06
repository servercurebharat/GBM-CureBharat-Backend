import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const User = require('./src/models/User').default;
  
  const taruns = await User.find({ name: { $regex: 'Tarun Sengar', $options: 'i' } });
  console.log("Tarun Sengar accounts:");
  taruns.forEach((u: any) => console.log(`_id: ${u._id}, memberId: ${u.memberId}, role: ${u.role}`));
  
  const kamini = await User.findOne({ name: { $regex: 'Kamini Punewar', $options: 'i' } });
  if (kamini) {
    console.log(`\nKamini Punewar - memberId: ${kamini.memberId}, referrerId: ${kamini.referrerId}`);
  }
  
  process.exit(0);
}

run().catch(console.error);
