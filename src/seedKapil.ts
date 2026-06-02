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

    // Find Amit Mishra
    const amit = await User.findOne({ mobile: '9826490451' });
    if (!amit) {
      console.log('Amit Mishra not found!');
      process.exit(1);
    }

    // 1. Create Kapil Dube
    const mobile = '9977102030';
    let customer = await User.findOne({ mobile });
    if (!customer) {
      const hccCount = await User.countDocuments({ role: 'hcc' });
      const memberId = `CB-HCC-${String(hccCount + 1000).padStart(4, '0')}`;
      
      console.log(`Creating user with memberId: ${memberId}`);
      customer = new User({
        name: 'Kapil Dube',
        mobile,
        email: 'kapildube2024@gmail.com',
        state: 'MP',
        password: '123456',
        role: 'hcc',
        rank: 'HCC',
        memberId,
        referrerId: amit._id, // Hierarchy link!
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

    // 2. Buy the Plan (Create Sale by Amit Mishra to Kapil Dube)
    const plan = await Plan.findOne({ price: 499900 });
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
        sellerId: amit._id, // Amit Mishra is the seller
        sellerMemberId: amit.memberId,
        plan: plan._id,
        customerName: 'Kapil Dube',
        customerMobile: mobile,
        customerEmail: 'kapildube2024@gmail.com',
        customerState: 'MP',
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

      // 3. Process Commission so Amit gets paid
      console.log('Processing Commission...');
      await processCommission(sale._id.toString());
      console.log('Commission processing complete!');
    }

    console.log('✅ Done seeding Kapil Dube under Amit Mishra!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
