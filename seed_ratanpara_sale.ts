import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './src/models/User';
import Plan from './src/models/Plan';
import Sale from './src/models/Sale';
import { processCommission, getCurrentCycleMonth } from './src/lib/commission';
import './src/models/Wallet';
import './src/models/Config';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    const seller = await User.findOne({ name: /HJ Finance|Ratanpara Meet/i });
    if (!seller) {
      console.log('Seller (HJ Finance / Ratanpara Meet) not found!');
      return;
    }

    // Usually price is stored in paise, so 1999 * 100 = 199900
    const plan = await Plan.findOne({ price: 199900 });
    if (!plan) {
      console.log('Plan 1999 not found!');
      return;
    }

    const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);

    const newSale = new Sale({
      policyId,
      sellerId: seller._id,
      sellerMemberId: seller.memberId,
      plan: plan._id,
      customerName: 'Dipak kumar Parsania',
      customerMobile: '9427445685',
      customerEmail: 'dipakparsania2021@gmail.com',
      customerState: 'Gujarat',
      saleAmount: plan.price + gstAmount,
      businessVolume: plan.businessVolume,
      cycleMonth: getCurrentCycleMonth(),
      status: 'active',
      sourceType: 'dashboard',
      razorpayOrderId: 'INTERNAL_SEED',
      razorpayPaymentId: `INT_PAY_${Date.now()}`
    });

    await newSale.save();
    console.log(`Sale successfully saved! Calculating commission...`);
    
    await processCommission(newSale._id.toString());
    
    console.log(`Commission processed successfully!`);
    console.log(`Sale mapped to seller: ${seller.name} (${seller.memberId})`);
    console.log(`Customer: Dipak kumar Parsania`);
    console.log(`Plan: ${plan.name} (1999)`);
    console.log(`Policy ID: ${policyId}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
