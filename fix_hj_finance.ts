import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const User = require('./src/models/User').default;
  
  // Restore Anandkumar Kalal to HJ Finance
  const hjFinanceId = '6a3bd7d6286cb84c196874e0';
  await User.updateOne(
    { memberId: 'CB-HCC-1006' },
    { $set: { sponsorId: 'CB-HCM-1001', parentId: 'CB-HCM-1001', referrerId: hjFinanceId } }
  );

  // List all members currently under HJ Finance
  const users = await User.find({ referrerId: hjFinanceId });
  console.log("\nMembers currently under HJ Finance:");
  users.forEach((u: any) => console.log(`${u.name} (${u.memberId})`));

  process.exit(0);
}

run().catch(console.error);
