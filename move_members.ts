import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const User = require('./src/models/User').default;
  
  // Find the Admin user to get their ObjectId
  const admin = await User.findOne({ memberId: 'CB-ADMIN-1' });
  if (!admin) {
    console.log("Admin not found!");
    process.exit(1);
  }

  const targetIds = ['CB-HCC-1005', 'CB-HCC-1006', 'CB-HCC-1007', 'CB-HCC-1008'];
  
  // Update both sponsorId string and referrerId ObjectId
  const result = await User.updateMany(
    { memberId: { $in: targetIds } },
    { $set: { 
      sponsorId: 'CB-ADMIN-1', 
      parentId: 'CB-ADMIN-1',
      referrerId: admin._id 
    } }
  );
  
  console.log(`\nMoved ${result.modifiedCount} members to Admin (updated referrerId).`);
  process.exit(0);
}

run().catch(console.error);
