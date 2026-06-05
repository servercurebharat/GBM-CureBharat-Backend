import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Sale = mongoose.model('Sale', new mongoose.Schema({}, { strict: false }));

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const sales = await Sale.find({}).sort({ createdAt: 1 });
    console.log(`Total sales: ${sales.length}`);
    for (const s of sales) {
      const d = s.get('createdAt');
      console.log(`PolicyId: ${s.get('policyId')} | Customer: ${s.get('customerName')} | HBA: ${s.get('hbaId')} | HCM: ${s.get('hcmId')} | HCC: ${s.get('hccId')} | Seller: ${s.get('sellerId')} | Amount: ${s.get('saleAmount')} | Date: ${d} | _id: ${s._id}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}
run();
