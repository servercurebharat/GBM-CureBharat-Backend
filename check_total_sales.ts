import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Sale from './src/models/Sale';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    const totalSales = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$saleAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (totalSales.length > 0) {
      console.log(`Total Sales Count: ${totalSales[0].count}`);
      console.log(`Total Sales Amount: ₹${totalSales[0].totalAmount / 100}`);
    } else {
      console.log('No sales found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
