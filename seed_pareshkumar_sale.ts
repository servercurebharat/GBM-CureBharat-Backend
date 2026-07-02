import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './src/models/User';
import Plan from './src/models/Plan';
import Sale from './src/models/Sale';
import CustomerKYC from './src/models/CustomerKYC';
import { processCommission, getCurrentCycleMonth } from './src/lib/commission';
import './src/models/Wallet';
import './src/models/Config';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    let seller = await User.findOne({ name: /Virendra Thakkar/i });
    if (!seller) {
      console.log('Virendra Thakkar not found! Creating new seller...');
      seller = new User({
        name: 'Virendra Thakkar',
        email: 'virendra' + Date.now() + '@example.com',
        mobile: '9999999999',
        password: 'password123', // Hashed normally, but we can bypass or it gets pre-saved
        memberId: `CBV${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'hcc',
        rank: 'HCC',
        state: 'Gujarat',
        status: 'active',
        isKycVerified: true
      });
      await seller.save();
    }

    const plan = await Plan.findOne({ price: 199900 });
    if (!plan) {
      console.log('Plan 1999 not found!');
      return;
    }

    // Clean up existing sale to avoid duplicates if re-ran
    await Sale.deleteMany({ customerMobile: '9173374190' });
    await CustomerKYC.deleteMany({ mobile: '9173374190' });

    const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // We already have 2359 as Plan Amount with GST, so we can just use 199900 + 35982 = 235882
    const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);

    const newSale = new Sale({
      policyId,
      sellerId: seller._id,
      sellerMemberId: seller.memberId,
      plan: plan._id,
      customerName: 'Pareshkumar Vaghela',
      customerMobile: '9173374190',
      customerEmail: 'pareshkumarvaghela344@gmail.com',
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
    console.log(`Customer: Pareshkumar Vaghela`);
    console.log(`Plan: ${plan.name} (1999)`);
    console.log(`Policy ID: ${policyId}`);

    // Create KYC
    const kyc = new CustomerKYC({
      saleId: newSale._id,
      fullName: 'Pareshkumar Vaghela',
      email: 'pareshkumarvaghela344@gmail.com',
      mobile: '9173374190',
      dob: '1993-06-28', // 6/28/1993
      gender: 'Male',
      addressLine1: 'Shiv Nagar, Ajarpura, Anand',
      city: 'Gujarat',
      state: 'Gujarat',
      pincode: '388310',
      pan: 'BKEPV9868G',
      occupation: 'Self Employed',
      maritalStatus: 'Single',
      
      familyDetails: [{
        name: 'Jitendrabhai Vaghela',
        relation: 'Father',
        dob: '1970-01-01', // 1/1/1970
        gender: 'Male'
      }],

      nomineeName: 'Jitendrabhai Vaghela',
      nomineeRelation: 'Father',
      nomineeDOB: '1970-01-01',
      nomineeContact: '',
      
      // Setting status to approved
      status: 'approved',
      approvedAt: new Date(),
    });
    
    await kyc.save();
    console.log('Customer KYC created successfully.');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
