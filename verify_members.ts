import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const User = require('./src/models/User').default;
  
  const names = ['Jaysukhbhai', 'Mayur Karia', 'Karan Miyatra', 'Anandkumar Kalal', 'Virendra Thakkar'];
  
  for (const name of names) {
    const users = await User.find({ name: { $regex: name, $options: 'i' } });
    if (users.length === 0) {
      console.log(`❌ Not found: ${name}`);
    } else {
      for (const u of users) {
        console.log(`✅ Found: ${u.name} (${u.memberId}) - Current Sponsor: ${u.sponsorId} - Referrer: ${u.referrerId}`);
      }
    }
  }
  process.exit(0);
}

run().catch(console.error);
