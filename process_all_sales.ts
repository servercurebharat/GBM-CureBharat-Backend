import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { processCommission } from './src/lib/commission';
import Sale from './src/models/Sale';
import User from './src/models/User';
import Wallet from './src/models/Wallet';
import './src/models/Plan';
import './src/models/Config';

async function run() {
  try {
    let uri = process.env.MONGODB_URI as string;
    if (uri.includes('curebharat')) {
      uri = uri.replace('curebharat', 'test');
    }
    const Wallet = mongoose.models.Wallet || require('./src/models/Wallet').default;

    // Reset all wallets and their balances
    await Wallet.deleteMany({});
    console.log(`[Commission Engine] Deleted all old wallets.`);
    
    let totalSalesProcessed = 0;

    // 2. Recreate empty wallets for all existing users
    const users = await User.find({});
    for (const user of users) {
      const wallet = new Wallet({
        user: user._id,
        provisionalBalance: 0,
        finalBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        ledger: []
      });
      await wallet.save();
    }
    console.log(`Created fresh empty wallets for ${users.length} users`);

    // 3. Mark all sales as unprocessed and reset businessVolume if needed?
    // The Excel says Plan Amount = 4999. In DB it might be 499900.
    // The businessVolume was 399900. Let's just process them as they are in the DB.
    await Sale.updateMany({}, { $set: { commissionProcessed: false } });
    
    // 4. Reprocess all sales!
    const sales = await Sale.find({});
    let count = 0;
    for (const sale of sales) {
      try {
        await processCommission(sale._id.toString());
        count++;
        console.log(`Processed commission for sale: ${sale.customerName}`);
      } catch(e) {
        console.log(`Failed to process sale for ${sale.customerName}: ${(e as Error).message}`);
      }
    }

    console.log(`Successfully reprocessed ${count} sales!`);

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
