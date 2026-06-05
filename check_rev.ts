import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const SaleSchema = new mongoose.Schema({ status: String, saleAmount: Number }, { strict: false });
const Sale = mongoose.model('Sale', SaleSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const rev = await Sale.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: null, totalRevenue: { $sum: '$saleAmount' } } }
  ]);
  
  console.log('Total Revenue:', rev);

  mongoose.disconnect();
}

run();
