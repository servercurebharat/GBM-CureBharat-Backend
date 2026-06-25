import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/models/User';
import Wallet from '../src/models/Wallet';
import Sale from '../src/models/Sale';
import CustomerKYC from '../src/models/CustomerKYC';
import ActivityLog from '../src/models/ActivityLog';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const memberId = 'CB-HCC-1008';
  
  const user = await User.findOne({ memberId });
  if (!user) {
    console.log(`User ${memberId} not found`);
    process.exit(0);
  }

  console.log('Found user:', user.name, user.mobile);

  // Delete Wallet
  const walletRes = await Wallet.deleteMany({ user: user._id });
  console.log('Deleted wallets:', walletRes.deletedCount);

  // Delete Sales made by user
  const sales = await Sale.find({ sellerId: user._id });
  const saleIds = sales.map(s => s._id);
  
  if (saleIds.length > 0) {
    const kycRes = await CustomerKYC.deleteMany({ saleId: { $in: saleIds } });
    console.log('Deleted KYCs for sales:', kycRes.deletedCount);
    const saleRes = await Sale.deleteMany({ sellerId: user._id });
    console.log('Deleted sales:', saleRes.deletedCount);
  }

  // Delete Activity Logs
  const actRes = await ActivityLog.deleteMany({ userId: user._id });
  console.log('Deleted Activity Logs:', actRes.deletedCount);

  // Delete the user
  const userRes = await User.deleteOne({ _id: user._id });
  console.log('Deleted user:', userRes.deletedCount);

  console.log('Done deleting member', memberId);
  process.exit(0);
}

run().catch(console.error);
