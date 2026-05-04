import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected!');

    const User = mongoose.model('User', new mongoose.Schema({ memberId: String }));
    const Sale = mongoose.model('Sale', new mongoose.Schema({ 
      policyId: String, 
      hccId: mongoose.Schema.Types.ObjectId,
      hcmId: mongoose.Schema.Types.ObjectId,
      hbaId: mongoose.Schema.Types.ObjectId,
      plan: mongoose.Schema.Types.ObjectId,
      saleAmount: Number,
      businessVolume: Number,
      commissionProcessed: Boolean,
      cycleMonth: String,
      status: String
    }, { collection: 'sales' }));
    const Plan = mongoose.model('Plan', new mongoose.Schema({ price: Number, businessVolume: Number }));

    // 1. Delete old seeded sales
    const delResult = await Sale.deleteMany({ policyId: { $regex: 'POL-SEED' } });
    console.log(`Deleted ${delResult.deletedCount} corrupted sales.`);

    // 2. Find real users
    const amit = await User.findOne({ memberId: 'CB-HCC-0001' });
    const priya = await User.findOne({ memberId: 'CB-HCM-0001' });
    const sanjay = await User.findOne({ memberId: 'CB-HBA-0001' });
    const plan = await Plan.findOne();

    if (!amit || !priya || !sanjay || !plan) {
      console.error('Missing required data:', { amit:!!amit, priya:!!priya, sanjay:!!sanjay, plan:!!plan });
      process.exit(1);
    }

    // 3. Create a clean sale
    const newSale = new Sale({
      policyId: 'CB-POL-REAL-001',
      hccId: amit._id,
      hcmId: priya._id,
      hbaId: sanjay._id,
      plan: plan._id,
      saleAmount: plan.price,
      businessVolume: plan.businessVolume,
      commissionProcessed: false,
      cycleMonth: '2026-05',
      status: 'active'
    });

    await newSale.save();
    console.log('Real Sale Created: CB-POL-REAL-001 with correct hierarchy!');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
