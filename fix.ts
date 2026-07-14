import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Sale from './src/models/Sale';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    const sale = await Sale.findOne({ customerMobile: '9173374190' });
    if (sale) {
      sale.sellerId = new mongoose.Types.ObjectId('6a3bd7d6286cb84c196874e0') as any;
      sale.sellerMemberId = 'CB-HCM-1001';
      await sale.save();
      console.log('Updated sellerId to HJ Finance for Pareshkumar sale');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
