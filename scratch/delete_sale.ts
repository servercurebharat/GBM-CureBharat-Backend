import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Sale from '../src/models/Sale';
import User from '../src/models/User';
import CustomerKYC from '../src/models/CustomerKYC';
import Wallet from '../src/models/Wallet';
import Payment from '../src/models/Payment';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const policyId = 'CB-POL-1780722146927-1415';
  
  const sale = await Sale.findOne({ policyId });
  if (!sale) {
    console.log('Sale not found');
    process.exit(0);
  }

  console.log('Found sale:', sale.policyId, sale.customerName);

  // Remove from CustomerKYC
  const kycRes = await CustomerKYC.deleteMany({ saleId: sale._id });
  console.log('Deleted KYC:', kycRes.deletedCount);

  // Remove related payments (if any)
  const paymentRes = await Payment.deleteMany({ saleId: sale._id });
  console.log('Deleted Payments:', paymentRes.deletedCount);

  // Decrease user stats
  const sellerId = sale.sellerId;
  await User.updateOne({ _id: sellerId }, {
    $inc: {
      totalPersonalSales: -1,
      activePolicies: -1
    }
  });
  console.log('Updated user stats for seller:', sellerId);

  // Delete the sale itself
  const saleRes = await Sale.deleteOne({ _id: sale._id });
  console.log('Deleted sale:', saleRes.deletedCount);

  console.log('Done');
  process.exit(0);
}

run().catch(console.error);
