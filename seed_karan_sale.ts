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
    const seller = await User.findOne({ name: /Karan/i });
    if (!seller) {
      console.log('Karan Miyatra not found!');
      return;
    }

    const plan = await Plan.findOne({ price: 499900 });
    if (!plan) {
      console.log('Plan 4999 not found!');
      return;
    }

    const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);

    const newSale = new Sale({
      policyId,
      sellerId: seller._id,
      sellerMemberId: seller.memberId,
      plan: plan._id,
      customerName: 'YAGNIK LALJIBHAI SABHAYA',
      customerMobile: '7575850216',
      customerEmail: 'yagnik.sabhaya4444@gmail.com',
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
    await processCommission(newSale._id.toString());
    
    console.log(`Sale created successfully for ${seller.name} (${seller.memberId}).`);
    console.log(`Customer: YAGNIK LALJIBHAI SABHAYA`);
    console.log(`Plan: ${plan.name} (4999)`);
    console.log(`Policy ID: ${policyId}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
