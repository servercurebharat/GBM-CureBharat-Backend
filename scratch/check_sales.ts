import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  const db = mongoose.connection.db;
  const sales = await db!.collection('sales').find({ status: 'active' }).toArray();
  const sum = sales.reduce((a, b) => a + (b.saleAmount || 0), 0);
  console.log('Total sales count:', sales.length);
  console.log('Total revenue:', sum);
  
  // Group by seller
  const bySeller = await db!.collection('sales').aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$sellerId', count: { $sum: 1 }, revenue: { $sum: '$saleAmount' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } },
    { $unwind: '$seller' },
    { $project: { _id: 1, name: '$seller.name', state: '$seller.state', count: 1, revenue: 1 } }
  ]).toArray();
  console.log('By seller:', JSON.stringify(bySeller, null, 2));
  
  process.exit(0);
});
