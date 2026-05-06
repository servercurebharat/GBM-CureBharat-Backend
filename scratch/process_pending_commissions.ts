import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { processCommission } from './src/lib/commission';
import Sale from './src/models/Sale';

dotenv.config();

async function run() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected!');

    const sales = await Sale.find({ commissionProcessed: false });
    console.log(`Found ${sales.length} unprocessed sales.`);

    for (const sale of sales) {
      console.log(`Processing sale: ${sale.policyId}...`);
      await processCommission(sale._id.toString());
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
