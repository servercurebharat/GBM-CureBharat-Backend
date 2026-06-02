import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

import User from './models/User';
import Wallet from './models/Wallet';
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
    // Looking up by mobile
    const hjFinance = await User.findOne({ mobile: '8490818234' });
    if (!hjFinance) {
      console.log('HJ Finance not found!');
      process.exit(1);
    }

    // 1. Create Karan Miyatra
    const mobile = '9924216843';
    let customer = await User.findOne({ mobile });
    if (!customer) {
      const hccCount = await User.countDocuments({ role: 'hcc' });
      const memberId = `CB-HCC-${String(hccCount + 1000).padStart(4, '0')}`;

      console.log(`Creating user with memberId: ${memberId}`);
      customer = new User({
        name: 'Karan Miyatra',
        mobile,
        email: 'karanmiyatra0837@gmail.com',
        state: 'Gujarat',
        password: '123456',
        role: 'hcc',
        rank: 'HCC',
        memberId,
        referrerId: hjFinance._id, // Hierarchy link!
        status: 'active',
        kycStatus: 'pending',
        personalSalesCount: 1,
      });
      await customer.save();
      console.log('Customer (HCC) created:', customer._id);

      const wallet = new Wallet({
        user: customer._id,
        provisionalBalance: 0,
        finalBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        ledger: []
      });
      await wallet.save();
      console.log('Wallet created for Customer.');
    }

    // 2. Buy the Plan (Create Sale by HJ Finance to Karan Miyatra)
    const plan = await Plan.findOne({ price: 199900 });
    if (!plan) {
      console.log('Plan not found!');
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

      const sale = new Sale({
        policyId,
        sellerId: hjFinance._id, // HJ Finance is the seller
        sellerMemberId: hjFinance.memberId,
        plan: plan._id,
        customerName: 'Karan Miyatra',
        customerMobile: mobile,
        customerEmail: 'karanmiyatra0837@gmail.com',
        customerState: 'Gujarat',
        enrollmentType: 'distributor',
        saleAmount: totalPaise,
        businessVolume: plan.businessVolume || 0,
        cycleMonth,
        status: 'active',
        sourceType: 'dashboard',
        paymentMethod: 'cashfree',
        cashfreeOrderId: `seed_${Date.now()}`
      });
      await sale.save();
      console.log('Sale created successfully! ID:', sale._id);

      // 3. Process Commission so HJ Finance gets paid
      console.log('Processing Commission...');
      await processCommission(sale._id.toString());
      console.log('Commission processing complete!');
    }

    console.log('✅ Done seeding Karan Miyatra under HJ Finance!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
