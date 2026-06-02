import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

import User from './models/User';
import Sale from './models/Sale';
import Plan from './models/Plan';
import { processCommission } from './lib/commission';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seed() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env');

    if (mongoUri.includes('mongodb.net/?') || mongoUri.includes('mongodb.net:27017/?')) {
      mongoUri = mongoUri.replace('/?', '/test?');
    }

    console.log('Connecting to', mongoUri.split('@')[1] || mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    // Find HJ Finance
    // Looking up by mobile from the first seeding
    const hjFinance = await User.findOne({ mobile: '8490818234' });
    if (!hjFinance) {
      console.log('HJ Finance not found! (Mobile: 8490818234)');
      process.exit(1);
    }

    // Customer details
    const mobile = '9898161195';
    
    // 1. Buy the Plan (Create Sale by HJ Finance for Anandkumar kalal)
    // The plan is 4999
    const plan = await Plan.findOne({ price: 499900 });
    if (!plan) {
      console.log('4999 Plan not found!');
      process.exit(1);
    }

    const existingSale = await Sale.findOne({ customerMobile: mobile, plan: plan._id });
    if (existingSale) {
      console.log('Sale already exists. Processing commission if needed...');
      if (!existingSale.commissionProcessed) {
        await processCommission(existingSale._id.toString());
      }
    } else {
      const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalPaise = plan.price + Math.round((plan.price * (plan.gstPercent || 18)) / 100);

      const now = new Date();
      const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // This is a retail sale, meaning enrollmentType is 'customer'
      const sale = new Sale({
        policyId,
        sellerId: hjFinance._id, // HJ Finance is the seller
        sellerMemberId: hjFinance.memberId,
        plan: plan._id,
        customerName: 'Anandkumar kalal',
        customerMobile: mobile,
        customerEmail: 'anand_kalal@yahoo.com',
        customerState: 'Gujarat',
        enrollmentType: 'customer', // Customer ONLY
        saleAmount: totalPaise,
        businessVolume: plan.businessVolume || 0,
        cycleMonth,
        status: 'active',
        sourceType: 'public_link', // Standard for retail sales
        paymentMethod: 'cashfree', 
        cashfreeOrderId: `seed_${Date.now()}`
      });
      await sale.save();
      console.log('Sale created successfully! ID:', sale._id);

      // 2. Process Commission so HJ Finance gets paid
      console.log('Processing Commission...');
      await processCommission(sale._id.toString());
      console.log('Commission processing complete!');
    }

    console.log('✅ Done seeding Anandkumar Kalal retail sale for HJ Finance!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
