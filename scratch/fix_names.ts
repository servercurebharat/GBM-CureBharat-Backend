import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Sale from '../src/models/Sale';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const res = await Sale.updateOne(
    { policyId: 'CB-POL-1780407028010-4157' },
    { $set: { customerName: 'Himmatbhai Miyatra' } }
  );
  console.log('Updated CB-POL-1780407028010-4157:', res.modifiedCount);

  console.log('Done');
  process.exit(0);
}

run().catch(console.error);
