import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const UserSchema = new mongoose.Schema({ memberId: String }, { strict: false });
const SaleSchema = new mongoose.Schema({ seller: mongoose.Schema.Types.ObjectId, customerName: String, status: String, paymentId: mongoose.Schema.Types.ObjectId }, { strict: false });
const PaymentSchema = new mongoose.Schema({ saleId: mongoose.Schema.Types.ObjectId }, { strict: false });
const CustomerKYCSchema = new mongoose.Schema({ saleId: mongoose.Schema.Types.ObjectId }, { strict: false });

const User = mongoose.model('User', UserSchema);
const Sale = mongoose.model('Sale', SaleSchema);
const Payment = mongoose.model('Payment', PaymentSchema);
const CustomerKYC = mongoose.model('CustomerKYC', CustomerKYCSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const sales = await Sale.find({ customerName: { $in: [/SARTHAK/i, /ROHAN GADEKAR/i, /RAKESH/i, /SURESH BHAI/i, /ADITYA/i] } });
    console.log(`Found ${sales.length} specific sales`);

    for (const sale of sales) {
      console.log(`Deleting sale: ${sale.customerName}`);
      
      // Also delete KYC
      await CustomerKYC.deleteMany({ saleId: sale._id });
      
      // Also delete Payment
      if (sale.paymentId) {
        await Payment.deleteMany({ _id: sale.paymentId });
      } else {
        await Payment.deleteMany({ saleId: sale._id });
      }

      await Sale.deleteOne({ _id: sale._id });
    }

    console.log('Deleted testing sales.');
  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
