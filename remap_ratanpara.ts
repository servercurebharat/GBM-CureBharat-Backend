import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './src/models/User';
import Sale from './src/models/Sale';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    // 1. Correct the HCC User record from 'Dipak kumar Parsania' to 'Ratanpara Meet'
    // This uses the same record we created earlier, just correcting the identity.
    const hcc = await User.findOne({ memberId: 'CB-HCC-1014' });
    if (hcc) {
      hcc.name = 'Ratanpara Meet';
      hcc.address = {
          ...hcc.address,
          state: 'Gujarat',
          city: 'Devbhumi Dwarka',
          zipCode: '360510'
      };
      await hcc.save();
      console.log(`✅ Updated HCC User (CB-HCC-1014) name to: Ratanpara Meet`);
    } else {
        console.log("❌ Could not find CB-HCC-1014 to update.");
    }

    // 2. Ensure the Sale record correctly identifies Dipak as the Customer and Ratanpara as the Seller
    const sale = await Sale.findOne({ customerMobile: '9427445685' }).sort({ createdAt: -1 });
    if (sale) {
      sale.customerName = 'Dipak kumar Parsania';
      
      if(hcc) {
        sale.sellerId = hcc._id;
        sale.sellerMemberId = hcc.memberId;
      }
      
      await sale.save();
      console.log(`✅ Sale ${sale.policyId} updated:`);
      console.log(`   - Customer: ${sale.customerName}`);
      console.log(`   - Sold By (HCC): Ratanpara Meet (${sale.sellerMemberId})`);
    } else {
        console.log("❌ Could not find the sale to update.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
