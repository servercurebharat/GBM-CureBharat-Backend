import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';
import Plan from './models/Plan';
import Wallet from './models/Wallet';
import EPin from './models/EPin';
import Config from './models/Config';

dotenv.config();

async function seed() {
  try {
    // --- CONNECT DB ---
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in env');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // --- CLEAR ALL COLLECTIONS ---
    await Promise.all([
      User.deleteMany({}),
      Plan.deleteMany({}),
      Wallet.deleteMany({}),
      EPin.deleteMany({}),
      Config.deleteMany({})
    ]);
    console.log('Collections cleared');

    // --- SEED SYSTEM CONFIG ---
    const defaultConfig = [
      { key: 'hcc_direct_percent', value: 40, description: 'Direct income for HCC from policy BV' },
      { key: 'hcm_override_percent', value: 40, description: 'Override for HCM from HCC earnings' },
      { key: 'hba_override_percent', value: 40, description: 'Override for HBA from HCM earnings' },
      { key: 'sh_leadership_percent', value: 2, description: 'Leadership bonus for SH from state BV' },
      { key: 'min_sales_active', value: 1, description: 'Min sales per month to remain active' },
      { key: 'hcc_to_hcm_sales', value: 12, description: 'Personal sales needed for HCM rank' },
      { key: 'hcc_to_hcm_recruits', value: 12, description: 'Direct recruits needed for HCM rank' }
    ];
    await Config.insertMany(defaultConfig);
    console.log('System configuration seeded');

    // --- CREATE WELLNESS PLANS ---
    const plans = await Plan.insertMany([
      {
        name: 'Basic Wellness',
        price: 99900,          // ₹999 in paise
        businessVolume: 0,
        isCommissionable: false,
        gstPercent: 18,
        description: 'Entry level onboarding plan. Non-commissionable.',
        isActive: true
      },
      {
        name: 'Wellness Plus',
        price: 149900,         // ₹1499 in paise
        businessVolume: 0,
        isCommissionable: false,
        gstPercent: 18,
        description: 'Standard onboarding plan. Non-commissionable.',
        isActive: true
      },
      {
        name: 'Super Suraksha',
        price: 199900,         // ₹1999 in paise
        businessVolume: 169406, // ₹1999 / 1.18 = ₹1694.06 in paise
        isCommissionable: true,
        gstPercent: 18,
        description: 'Core wellness insurance plan. Commissionable.',
        isActive: true
      },
      {
        name: 'Family Suraksha',
        price: 299900,         // ₹2999 in paise
        businessVolume: 254152,
        isCommissionable: true,
        gstPercent: 18,
        description: 'Family wellness coverage plan. Commissionable.',
        isActive: true
      },
      {
        name: 'Premium Suraksha',
        price: 499900,         // ₹4999 in paise
        businessVolume: 423644,
        isCommissionable: true,
        gstPercent: 18,
        description: 'Premium full-coverage wellness plan. Commissionable.',
        isActive: true
      },
    ]);
    console.log(`Created ${plans.length} plans`);

    // --- CREATE ADMIN USER ---
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const admin = await User.create({
      name: 'System Administrator',
      mobile: '9000000000',
      email: 'admin@curebharat.in',
      password: adminPassword,
      role: 'admin',
      rank: 'ADMIN',
      memberId: 'CB-ADMIN-0001',
      state: 'Maharashtra',
      status: 'active',
      kycStatus: 'approved',
      personalSalesCount: 0,
      personalSalesThisMonth: 0,
      teamSize: 0,
      joiningDate: new Date(),
    });
    await Wallet.create({ user: admin._id });
    console.log('Admin created: mobile=9000000000, password=Admin@123');

    // --- CREATE STATE HEAD ---
    const shPassword = await bcrypt.hash('SH@123456', 12);
    const sh = await User.create({
      name: 'Rajesh Patel',
      mobile: '9100000001',
      email: 'rajesh.sh@curebharat.in',
      password: shPassword,
      role: 'sh',
      rank: 'SH',
      memberId: 'CB-SH-0001',
      referrerId: admin._id,
      state: 'Maharashtra',
      status: 'active',
      kycStatus: 'approved',
      kycDocuments: {
        aadhaarNumber: '1234-5678-9012',
        panNumber: 'ABCDE1234F',
        accountNumber: '1234567890',
        ifscCode: 'HDFC0001234'
      },
      personalSalesCount: 0,
      personalSalesThisMonth: 0,
      teamSize: 0,
      joiningDate: new Date(),
    });
    await Wallet.create({ user: sh._id });
    console.log('SH created: mobile=9100000001');

    // --- CREATE HBA ---
    const hbaPassword = await bcrypt.hash('HBA@123456', 12);
    const hba = await User.create({
      name: 'Sanjay Mehta',
      mobile: '9200000001',
      email: 'sanjay.hba@curebharat.in',
      password: hbaPassword,
      role: 'hba',
      rank: 'HBA',
      memberId: 'CB-HBA-0001',
      referrerId: sh._id,
      state: 'Maharashtra',
      status: 'active',
      kycStatus: 'approved',
      kycDocuments: {
        aadhaarNumber: '2345-6789-0123',
        panNumber: 'BCDEF2345G',
        accountNumber: '2345678901',
        ifscCode: 'ICIC0001234'
      },
      personalSalesCount: 15,
      personalSalesThisMonth: 3,
      teamSize: 8,
      joiningDate: new Date(),
    });
    await Wallet.create({ user: hba._id });
    console.log('HBA created: mobile=9200000001');

    // --- CREATE 2 HCMs ---
    const hcmPassword = await bcrypt.hash('HCM@123456', 12);
    
    const hcm1 = await User.create({
      name: 'Priya Desai',
      mobile: '9300000001',
      email: 'priya.hcm@curebharat.in',
      password: hcmPassword,
      role: 'hcm',
      rank: 'HCM',
      memberId: 'CB-HCM-0001',
      referrerId: hba._id,
      state: 'Maharashtra',
      status: 'active',
      kycStatus: 'approved',
      kycDocuments: {
        aadhaarNumber: '3456-7890-1234',
        panNumber: 'CDEFG3456H',
        accountNumber: '3456789012',
        ifscCode: 'SBIN0001234'
      },
      personalSalesCount: 14,
      personalSalesThisMonth: 2,
      teamSize: 5,
      joiningDate: new Date(),
    });
    await Wallet.create({ user: hcm1._id });

    const hcm2 = await User.create({
      name: 'Vikram Shah',
      mobile: '9300000002',
      email: 'vikram.hcm@curebharat.in',
      password: hcmPassword,
      role: 'hcm',
      rank: 'HCM',
      memberId: 'CB-HCM-0002',
      referrerId: hba._id,
      state: 'Maharashtra',
      status: 'active',
      kycStatus: 'approved',
      personalSalesCount: 13,
      personalSalesThisMonth: 1,
      teamSize: 3,
      joiningDate: new Date(),
    });
    await Wallet.create({ user: hcm2._id });
    console.log('2 HCMs created');

    // --- CREATE 3 HCCs ---
    const hccPassword = await bcrypt.hash('HCC@123456', 12);

    const hccUsers = await User.insertMany([
      {
        name: 'Amit Kumar',
        mobile: '9400000001',
        email: 'amit.hcc@curebharat.in',
        password: hccPassword,
        role: 'hcc',
        rank: 'HCC',
        memberId: 'CB-HCC-0001',
        referrerId: hcm1._id,
        state: 'Maharashtra',
        status: 'active',
        kycStatus: 'approved',
        personalSalesCount: 6,
        personalSalesThisMonth: 2,
        teamSize: 0,
        joiningDate: new Date(),
      },
      {
        name: 'Neha Sharma',
        mobile: '9400000002',
        email: 'neha.hcc@curebharat.in',
        password: hccPassword,
        role: 'hcc',
        rank: 'HCC',
        memberId: 'CB-HCC-0002',
        referrerId: hcm1._id,
        state: 'Maharashtra',
        status: 'active',
        kycStatus: 'pending',
        personalSalesCount: 3,
        personalSalesThisMonth: 1,
        teamSize: 0,
        joiningDate: new Date(),
      },
      {
        name: 'Ravi Joshi',
        mobile: '9400000003',
        email: 'ravi.hcc@curebharat.in',
        password: hccPassword,
        role: 'hcc',
        rank: 'HCC',
        memberId: 'CB-HCC-0003',
        referrerId: hcm2._id,
        state: 'Maharashtra',
        status: 'inactive',
        kycStatus: 'approved',
        personalSalesCount: 1,
        personalSalesThisMonth: 0,
        teamSize: 0,
        joiningDate: new Date(),
      },
    ]);
    for (const hcc of hccUsers) {
      await Wallet.create({ user: hcc._id });
    }
    console.log('3 HCCs created');

    // --- UPDATE teamSize counts ---
    await User.findByIdAndUpdate(sh._id, { teamSize: 1 });
    await User.findByIdAndUpdate(hba._id, { teamSize: 5 });
    await User.findByIdAndUpdate(hcm1._id, { teamSize: 2 });
    await User.findByIdAndUpdate(hcm2._id, { teamSize: 1 });

    // --- GENERATE SAMPLE E-PINS ---
    const superSurakshaPlan = plans.find((p: any) => p.name === 'Super Suraksha');
    if (superSurakshaPlan) {
      const epins = [];
      for (let i = 1; i <= 20; i++) {
        const code = `CB-MH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        epins.push({
          pinCode: code,
          plan: superSurakshaPlan._id,
          value: superSurakshaPlan.price,
          generatedBy: admin._id,
          currentOwnerId: hba._id,
          status: 'unused'
        });
      }
      await EPin.insertMany(epins);
      console.log('20 E-Pins generated and assigned to HBA');
    }

    // --- PRINT SUMMARY ---
    console.log('\n✅ SEED COMPLETE');
    console.log('================================');
    console.log('LOGIN CREDENTIALS:');
    console.log('Admin  → 9000000000 | Admin@123');
    console.log('SH     → 9100000001 | SH@123456');
    console.log('HBA    → 9200000001 | HBA@123456');
    console.log('HCM    → 9300000001 | HCM@123456');
    console.log('HCC    → 9400000001 | HCC@123456');
    console.log('================================');

  } catch (error) {
    console.error('Seed Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
