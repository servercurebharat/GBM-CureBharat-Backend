import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './src/models/User';
import Sale from './src/models/Sale';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    const hcm = await User.findOne({ name: /HJ Finance/i });
    if (!hcm) {
      console.log('HJ Finance not found!');
      process.exit(0);
    }

    const sale = await Sale.findOne({ customerMobile: '9427445685' }).sort({ createdAt: -1 });
    if (sale) {
      sale.sellerId = hcm._id;
      sale.sellerMemberId = hcm.memberId;
      await sale.save();
      
      console.log(`✅ Sale ${sale.policyId} updated successfully:`);
      console.log(`   - Sold By: ${hcm.name} (${hcm.memberId})`);
      console.log(`   - Customer: ${sale.customerName}`);
    } else {
      console.log('Sale not found.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
