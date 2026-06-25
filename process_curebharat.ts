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
    const uri = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/curebharat?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';
    
    await mongoose.connect(uri);
    console.log('Connected to CureBharat DB');

    // 1. Delete all existing wallets
    await Wallet.deleteMany({});
    console.log('Deleted all old wallets');

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
