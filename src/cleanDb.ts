import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import all models
import ActivityLog from './models/ActivityLog';
import Complaint from './models/Complaint';
import EPin from './models/EPin';
import Notification from './models/Notification';
import OTP from './models/OTP';
import Payment from './models/Payment';
import Sale from './models/Sale';
import User from './models/User';
import Wallet from './models/Wallet';
import Withdrawal from './models/Withdrawal';

dotenv.config();

const KEEP_ADMINS = ['9689509651', '8269210100'];

async function cleanDatabase() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env');

    // Ensure it targets the curebharat database, not test
    if (mongoUri.includes('mongodb.net/?') || mongoUri.includes('mongodb.net:27017/?')) {
      mongoUri = mongoUri.replace('/?', '/curebharat?');
    }
    if (!mongoUri.includes('curebharat')) {
      console.log('WARNING: URI does not seem to contain curebharat DB name.');
    }

    console.log(`Connecting to database... (${mongoUri.split('@')[1] || mongoUri})`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    console.log('1. Deleting all Sales, Payments, and Withdrawals...');
    await Sale.deleteMany({});
    await Payment.deleteMany({});
    await Withdrawal.deleteMany({});

    console.log('2. Deleting logs, complaints, and notifications...');
    await ActivityLog.deleteMany({});
    await Complaint.deleteMany({});
    await Notification.deleteMany({});
    await EPin.deleteMany({});
    await OTP.deleteMany({});

    console.log('3. Deleting all users EXCEPT the two main admins...');
    const deleteUsersResult = await User.deleteMany({ mobile: { $nin: KEEP_ADMINS } });
    console.log(`Deleted ${deleteUsersResult.deletedCount} users.`);

    console.log('4. Resetting stats for the two main admins...');
    const resetResult = await User.updateMany(
      { mobile: { $in: KEEP_ADMINS } },
      {
        $set: {
          personalSalesCount: 0,
          personalSalesThisMonth: 0,
          teamSalesCount: 0,
          teamSalesThisMonth: 0,
          totalTeamSize: 0,
          income: 0,
          rank: 'ADMIN', // Ensuring they stay as admins
          isActive: true
        }
      }
    );
    console.log(`Reset stats for ${resetResult.modifiedCount} admins.`);

    console.log('5. Deleting all wallets and re-creating empty ones for the admins...');
    await Wallet.deleteMany({});
    
    // Find the admins to create fresh empty wallets for them
    const admins = await User.find({ mobile: { $in: KEEP_ADMINS } });
    for (const admin of admins) {
      const wallet = new Wallet({
        user: admin._id,
        provisionalBalance: 0,
        finalBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        ledger: []
      });
      await wallet.save();
    }
    console.log(`Created 0-balance wallets for ${admins.length} admins.`);

    console.log('\n✅ DATABASE CLEANUP COMPLETE! Handover ready.');
    console.log('NOTE: Product Catalogs (Plans) and Configs were kept intact.');

    process.exit(0);
  } catch (err) {
    console.error('Error during database cleanup:', err);
    process.exit(1);
  }
}

cleanDatabase();
