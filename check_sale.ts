import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const Sale = require('./src/models/Sale').default;
  const Plan = require('./src/models/Plan').default;
  
  const sale = await Sale.findOne({ policyId: 'CB-SS-0019' }).populate('plan');
  if (!sale) {
    console.log("Sale CB-SS-0019 not found.");
  } else {
    console.log("Sale:", JSON.stringify(sale, null, 2));
  }
  
  const plans = await Plan.find({ name: { $regex: 'SUPER SURAKSHA', $options: 'i' } });
  console.log("\nPlans:", plans.map((p: any) => `${p.name} - ${p.price}`));

  process.exit(0);
}

run().catch(console.error);
