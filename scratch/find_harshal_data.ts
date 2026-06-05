import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({}, { strict: false });
const SaleSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model('User', UserSchema);
const Sale = mongoose.model('Sale', SaleSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const harshalId = new mongoose.Types.ObjectId('6a0aaaef6d3b091c6edbd022');
    
    const sales = await Sale.find({ sellerId: harshalId });
    console.log(`Found ${sales.length} sales by Harshal`);
    for (const s of sales) {
      console.log(`  - Sale: ${s.get('policyId')} / ${s.get('customerName')} / ${s.get('createdAt')}`);
    }

    const users = await User.find({ referrerId: harshalId });
    console.log(`Found ${users.length} users recruited by Harshal`);
    for (const u of users) {
      console.log(`  - User: ${u.get('memberId')} / ${u.get('name')} / ${u.get('createdAt')}`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}
run();
