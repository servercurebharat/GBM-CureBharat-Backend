import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const Sale = require('./src/models/Sale').default;
  require('./src/models/Plan'); // Register Plan model
  require('./src/models/User'); // Register User model
  require('./src/models/Wallet'); // Register Wallet model
  require('./src/models/Config'); // Register Config model
  require('./src/models/ActivityLog'); 
  
  const { processCommission } = require('./src/lib/commission');
  
  const sale = await Sale.findOne({ policyId: 'CB-SS-0019' });
  if (!sale) {
    console.log("Sale CB-SS-0019 not found.");
    process.exit(1);
  }

  const tarunId = '6a5b69ccfbf168190cfc90d7';
  const tarunMemberId = 'CB-HCM-1005';
  const amount = 199900; 

  await Sale.updateOne(
    { policyId: 'CB-SS-0019' },
    { 
      $set: {
        sellerId: tarunId,
        sellerMemberId: tarunMemberId,
        salesMode: 'direct',
        saleAmount: amount,
        businessVolume: amount,
        commissionProcessed: false
      } 
    }
  );

  console.log("Sale updated. Processing commission...");
  await processCommission(sale._id.toString());
  
  console.log("Commission processing complete!");
  process.exit(0);
}

run().catch(console.error);
