import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const Sale = require('./src/models/Sale').default;
  const User = require('./src/models/User').default;
  const Wallet = require('./src/models/Wallet').default;
  require('./src/models/Plan'); 
  require('./src/models/Config'); 
  require('./src/models/ActivityLog'); 
  
  const { processCommission } = require('./src/lib/commission');

  const sale = await Sale.findOne({ policyId: 'CB-SS-0019' });
  if (!sale) {
    console.log("Sale not found.");
    process.exit(1);
  }

  // 1. Delete all wallet transactions related to this sale description
  await Wallet.updateMany(
    {},
    { $pull: { ledger: { description: { $regex: 'CB-SS-0019' } } } }
  );
  console.log("Deleted old wallet transactions for CB-SS-0019.");

  // 2. Set Tarun's personalSalesCount to 1 to bypass "Entry Sale" logic
  // Tarun Sengar's regular account ID: 6a5b69ccfbf168190cfc90d7
  await User.updateOne(
    { _id: '6a5b69ccfbf168190cfc90d7' },
    { $set: { personalSalesCount: 1 } }
  );
  console.log("Updated Tarun's personalSalesCount to bypass entry sale shift.");

  // 3. Reset the sale
  await Sale.updateOne(
    { policyId: 'CB-SS-0019' },
    { 
      $set: {
        commissionProcessed: false
      } 
    }
  );

  console.log("Sale reset. Processing commission...");
  await processCommission(sale._id.toString());
  
  console.log("Commission processing complete!");
  process.exit(0);
}

run().catch(console.error);
