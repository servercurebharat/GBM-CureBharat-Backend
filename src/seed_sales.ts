import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import Plan from './models/Plan';
import Sale from './models/Sale';
import Wallet from './models/Wallet';

dotenv.config();

async function seedSales() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in env');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const users = await User.find({ role: { $in: ['sh', 'hba', 'hcm', 'hcc'] } });
    const plans = await Plan.find({ isActive: true, isCommissionable: true });
    
    if (users.length === 0 || plans.length === 0) {
      console.log('No users or commissionable plans found. Run main seed first.');
      process.exit(1);
    }

    const hccs = users.filter(u => u.role === 'hcc');
    const hcms = users.filter(u => u.role === 'hcm');
    const hbas = users.filter(u => u.role === 'hba');
    const shs = users.filter(u => u.role === 'sh');

    console.log(`Found ${hccs.length} HCCs, ${hcms.length} HCMs, ${hbas.length} HBAs, ${shs.length} SHs`);

    const cycleMonth = new Date().toISOString().slice(0, 7);
    const names = ['Rahul Sharma', 'Sneha Patil', 'Amit Gupta', 'Priya Singh', 'Vikram Malhotra', 'Anjali Desai', 'Suresh Kumar', 'Kavita Reddy'];
    const states = ['Maharashtra', 'Gujarat', 'Karnataka', 'Delhi', 'Rajasthan'];

    const salesToCreate = 60;
    const today = new Date();
    
    for (let i = 0; i < salesToCreate; i++) {
      const seller = hccs[Math.floor(Math.random() * hccs.length)];
      const plan = plans[Math.floor(Math.random() * plans.length)];
      
      // Random date within this month, some today
      const saleDate = new Date();
      if (i > 10) {
        saleDate.setDate(Math.floor(Math.random() * today.getDate()) + 1);
      }
      
      const policyId = `CB-POL-SEED-${Date.now()}-${i}`;
      const saleAmount = plan.price + Math.round(plan.price * 0.18);
      const bv = plan.businessVolume;

      // Find upline for this seller (simplified lookup based on seed.ts structure)
      const hcm = hcms.find(u => u._id.toString() === seller.referrerId?.toString());
      const hba = hcm ? hbas.find(u => u._id.toString() === hcm.referrerId?.toString()) : null;
      const sh = hba ? shs.find(u => u._id.toString() === hba.referrerId?.toString()) : (shs[0] || null);

      const newSale = new Sale({
        policyId,
        customerName: names[Math.floor(Math.random() * names.length)],
        customerMobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        customerState: states[Math.floor(Math.random() * states.length)],
        plan: plan._id,
        saleAmount,
        businessVolume: bv,
        sellerId: seller._id,
        sellerMemberId: seller.memberId,
        hccId: seller._id,
        hcmId: hcm?._id,
        hbaId: hba?._id,
        shId: sh?._id,
        razorpayOrderId: 'SEED_ORDER',
        razorpayPaymentId: `SEED_PAY_${Date.now()}_${i}`,
        cycleMonth,
        commissionProcessed: true,
        createdAt: saleDate
      });

      await newSale.save();

      // --- ADD LEDGER ENTRIES (Simulate Commission) ---
      
      // 1. HCC Direct (40% of BV)
      const hccIncome = Math.round(bv * 0.40);
      await addLedger(seller._id, hccIncome, 'direct', `Direct Income from ${policyId}`, saleDate);

      // 2. HCM Override (40% of HCC Income)
      if (hcm) {
        const hcmIncome = Math.round(hccIncome * 0.40);
        await addLedger(hcm._id, hcmIncome, 'override', `Override from ${seller.memberId} (${policyId})`, saleDate);
        
        // 3. HBA Override (40% of HCM Income)
        if (hba) {
          const hbaIncome = Math.round(hcmIncome * 0.40);
          await addLedger(hba._id, hbaIncome, 'override', `Override from ${hcm.memberId} (${policyId})`, saleDate);
        }
      }

      // 4. SH Leadership (2% of BV)
      if (sh) {
        const shIncome = Math.round(bv * 0.02);
        await addLedger(sh._id, shIncome, 'leadership', `Leadership Bonus from ${policyId}`, saleDate);
      }

      if (i % 10 === 0) console.log(`Processed ${i} sales...`);
    }

    console.log('✅ Successfully seeded 60 sales and associated transactions.');

  } catch (error) {
    console.error('Seed Sales Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function addLedger(userId: any, amount: number, type: string, desc: string, date: Date) {
  const wallet = await Wallet.findOne({ user: userId });
  if (wallet) {
    wallet.finalBalance += amount;
    wallet.totalEarned += amount;
    wallet.ledger.push({
      amount,
      type,
      description: desc,
      status: 'final',
      date: date,
      cycleMonth: date.toISOString().slice(0, 7)
    });
    await wallet.save();
  }
}

seedSales();
