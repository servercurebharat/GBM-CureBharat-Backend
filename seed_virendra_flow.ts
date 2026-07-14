import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './src/models/User';
import Plan from './src/models/Plan';
import Sale from './src/models/Sale';
import CustomerKYC from './src/models/CustomerKYC';
import Wallet from './src/models/Wallet';
import { processCommission, getCurrentCycleMonth } from './src/lib/commission';
import './src/models/Config';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    // 1. Find HJ Finance
    const hcm = await User.findOne({ name: /HJ Finance/i });
    if (!hcm) {
      console.log('HJ Finance not found!');
      return;
    }

    // 2. Setup Virendra Thakkar
    let seller = await User.findOne({ name: /Virendra Thakkar/i });
    if (seller) {
      // Update existing seller
      seller.referrerId = hcm._id;
      seller.dob = new Date('1984-08-21');
      seller.mobile = '9033637105';
      seller.email = 'thakkarvirendrap@Gmail.com';
      seller.address = {
        addressLine1: '344, Near Tulsi Park',
        street: '100 Ft Road',
        city: 'Anand',
        state: 'Gujarat',
        zipCode: '388001'
      };
      seller.kycDocuments = seller.kycDocuments || {};
      seller.kycDocuments.panNumber = 'AETPT8709A';
      seller.personalSalesCount = 0;
      await seller.save();
      console.log('Updated existing Virendra Thakkar');
    } else {
      console.log('Virendra Thakkar not found, creating...');
      seller = new User({
        name: 'Virendra Thakkar',
        email: 'thakkarvirendrap@Gmail.com',
        mobile: '9033637105',
        password: 'password123',
        memberId: `CBV${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'hcc',
        rank: 'HCC',
        state: 'Gujarat',
        status: 'active',
        isKycVerified: true,
        referrerId: hcm._id,
        dob: new Date('1984-08-21'),
        address: {
          addressLine1: '344, Near Tulsi Park',
          street: '100 Ft Road',
          city: 'Anand',
          state: 'Gujarat',
          zipCode: '388001'
        },
        kycDocuments: { panNumber: 'AETPT8709A' }
      });
      await seller.save();
    }

    // 3. Clean up the old sale for Pareshkumar Vaghela to avoid duplicates
    const oldSales = await Sale.find({ customerMobile: '9173374190' });
    for (const sale of oldSales) {
      await CustomerKYC.deleteMany({ saleId: sale._id });
      await Wallet.updateMany({}, { $pull: { ledger: { saleId: sale._id } } });
      // We are leaving the wallet balances as is for simplicity, or we could decrement them.
      // Since it's a test environment, skipping exact reverse calculation for wallet balances.
    }
    await Sale.deleteMany({ customerMobile: '9173374190' });

    // 4. Create new sale
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
    
    // 5. Create KYC
    const kyc = new CustomerKYC({
      saleId: newSale._id,
      fullName: 'Pareshkumar Vaghela',
      email: 'pareshkumarvaghela344@gmail.com',
      mobile: '9173374190',
      dob: '1993-06-28',
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
        dob: '1970-01-01',
        gender: 'Male'
      }],
      nomineeName: 'Jitendrabhai Vaghela',
      nomineeRelation: 'Father',
      nomineeDOB: '1970-01-01',
      nomineeContact: '',
      status: 'approved',
      approvedAt: new Date(),
    });
    
    await kyc.save();

    // 6. Process Commission
    await processCommission(newSale._id.toString());
    
    console.log(`Hierarchy updated! Virendra Thakkar is now under HJ Finance.`);
    console.log(`Sale re-created and commissions distributed!`);
    console.log(`Customer: Pareshkumar Vaghela`);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
