import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Adjust path to models based on execution from backend root
import User from './models/User';
import Wallet from './models/Wallet';
import Sale from './models/Sale';
import Plan from './models/Plan';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedHJ() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env');

    if (mongoUri.includes('mongodb.net/?') || mongoUri.includes('mongodb.net:27017/?')) {
      mongoUri = mongoUri.replace('/?', '/test?');
    }

    console.log('Connecting to', mongoUri.split('@')[1] || mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    // 1. Check if user already exists
    const mobile = '9826490451';
    let user = await User.findOne({ mobile });
    if (user) {
      console.log('User already exists. Updating email and KYC status...');
      user.email = 'amitmishra@example.com';
      user.kycStatus = 'pending';
      await user.save();
    } else {
      // Find a member ID
      const hcmCount = await User.countDocuments({ role: 'hcm' });
      const memberId = `CB-HCM-${String(hcmCount + 1000).padStart(4, '0')}`;
      
      console.log(`Creating user with memberId: ${memberId}`);
      user = new User({
        name: 'Amit Mishra',
        mobile,
        email: 'amitmishra@example.com',
        state: 'MP',
        password: '123456',
        role: 'hcm',
        rank: 'HCM',
        memberId,
        status: 'active',
        kycStatus: 'pending', // Pending per request
        personalSalesCount: 1, // Bought a plan
      });
      await user.save();
      console.log('User created:', user._id);

      // Create Wallet
      const wallet = new Wallet({
        user: user._id,
        provisionalBalance: 0,
        finalBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        ledger: []
      });
      await wallet.save();
      console.log('Wallet created.');
    }

    // 2. Buy the Plan (Create Sale)
    const plan = await Plan.findOne({ price: 499900 });
    if (!plan) {
      console.log('4999 Plan not found!');
      process.exit(1);
    }

    const existingSale = await Sale.findOne({ customerMobile: mobile, plan: plan._id });
    if (existingSale) {
      console.log('Sale already exists.');
    } else {
      const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalPaise = plan.price + Math.round((plan.price * (plan.gstPercent || 18)) / 100);

      const now = new Date();
      const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const sale = new Sale({
        policyId,
        sellerId: user._id, // self sale
        sellerMemberId: user.memberId,
        plan: plan._id,
        customerName: 'Amit Mishra',
        customerMobile: mobile,
        customerEmail: 'amitmishra@example.com',
        customerState: 'MP',
        enrollmentType: 'distributor',
        saleAmount: totalPaise,
        businessVolume: plan.businessVolume || 0,
        cycleMonth,
        status: 'active',
        sourceType: 'dashboard',
        paymentMethod: 'cashfree', // just to mock
        cashfreeOrderId: `seed_${Date.now()}`
      });
      await sale.save();
      console.log('Sale created successfully!', sale._id);
    }

    console.log('✅ Done seeding HJ Finance!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seedHJ();
