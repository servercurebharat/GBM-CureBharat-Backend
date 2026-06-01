import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { processCommission } from './src/lib/commission';
import Sale from './src/models/Sale';
import './src/models/Plan';
import './src/models/User';
import Wallet from './src/models/Wallet';
import './src/models/Config';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    const PlanModel = mongoose.model('Plan');
    
    // Set exactly to 3999
    await PlanModel.updateOne(
      { name: 'CB-Sampoorna Suraksha Plus' }, 
      { $set: { businessVolume: 399900 } }
    );

    // Clear old wallet ledger for the specific sale
    await Wallet.updateMany({}, { $pull: { ledger: { description: /CB-POL-1780228482497-5476/ } } });

    // Update the Sale and re-process
    const sale = await Sale.findOneAndUpdate(
      { policyId: 'CB-POL-1780228482497-5476' }, 
      { $set: { commissionProcessed: false, businessVolume: 399900 } },
      { new: true }
    );

    if (sale) {
      await processCommission(sale._id.toString());
      console.log('Commission re-processed with BV = 3999!');
    } else {
      console.log('Sale not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
