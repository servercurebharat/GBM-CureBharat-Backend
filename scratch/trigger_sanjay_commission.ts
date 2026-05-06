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

    const sale = await Sale.findOne({ policyId: 'CB-POL-REAL-001' });
    if (!sale) {
      console.error('Sale not found!');
      process.exit(1);
    }

    console.log(`Processing commission for sale: ${sale.policyId} (${sale._id})...`);
    await processCommission(sale._id.toString());

    console.log('Done! Sanjay Mehta should now have his commission in his wallet.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
