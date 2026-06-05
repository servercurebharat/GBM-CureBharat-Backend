import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Sale = mongoose.model('Sale', new mongoose.Schema({}, { strict: false }));
const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));
const CustomerKYC = mongoose.model('CustomerKYC', new mongoose.Schema({}, { strict: false }));
const Wallet = mongoose.model('Wallet', new mongoose.Schema({}, { strict: false }));

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const harshalId = new mongoose.Types.ObjectId('6a0aaaef6d3b091c6edbd022');
    
    // Find the specific sale
    const sale = await Sale.findOne({ policyId: 'CB-POL-1780674493322-2487' });
    if (sale) {
      console.log('Deleting sale:', sale.get('policyId'));
      
      // Delete KYC
      await CustomerKYC.deleteMany({ saleId: sale._id });
      
      // Delete Payment
      if (sale.get('paymentId')) {
        await Payment.deleteMany({ _id: sale.get('paymentId') });
      } else {
        await Payment.deleteMany({ saleId: sale._id });
      }
      
      // Remove ledger entries from wallets that reference this sale
      const policyId = sale.get('policyId');
      const walletsToFix = await Wallet.find({ 
        'ledger.description': { $regex: policyId } 
      });
      
      for (let w of walletsToFix) {
        const initialLedgerSize = w.get('ledger').length;
        // Filter out the ledger entries related to this sale
        const newLedger = w.get('ledger').filter((l: any) => !l.description.includes(policyId));
        
        let removedAmountProvisional = 0;
        let removedAmountFinal = 0;
        
        w.get('ledger').forEach((l: any) => {
           if (l.description.includes(policyId)) {
               if (l.status === 'provisional') removedAmountProvisional += l.amount;
               if (l.status === 'final') removedAmountFinal += l.amount;
           }
        });
        
        // Update wallet balances manually
        w.set('ledger', newLedger);
        w.set('provisionalBalance', w.get('provisionalBalance') - removedAmountProvisional);
        w.set('finalBalance', w.get('finalBalance') - removedAmountFinal);
        w.set('totalEarned', w.get('totalEarned') - (removedAmountProvisional + removedAmountFinal));
        
        await w.save();
        console.log(`Updated wallet for user ${w.get('user')} - removed ${initialLedgerSize - newLedger.length} ledger entries.`);
      }

      await Sale.deleteOne({ _id: sale._id });
      console.log('Sale deleted.');
      
      // Deduct personal sales count from Harshal
      const harshal: any = await User.findById(harshalId);
      if (harshal) {
         harshal.personalSalesCount = Math.max(0, harshal.personalSalesCount - 1);
         harshal.personalSalesThisMonth = Math.max(0, harshal.personalSalesThisMonth - 1);
         await harshal.save();
         console.log('Decremented Harshal personal sales count.');
      }
    }

    // Delete recent users
    const recentUsers = ['CB-HCC-1009', 'CB-HCC-1010', 'CB-HCM-1005'];
    for (const mId of recentUsers) {
       const u: any = await User.findOne({ memberId: mId });
       if (u) {
           console.log('Deleting user:', u.get('memberId'));
           await Wallet.deleteMany({ user: u._id });
           await User.deleteOne({ _id: u._id });
       }
    }
    
    // Decrement Harshal recruits count
    const harshal: any = await User.findById(harshalId);
    if (harshal) {
       harshal.personalRecruitsThisMonth = Math.max(0, harshal.personalRecruitsThisMonth - 3);
       harshal.teamSize = Math.max(0, harshal.teamSize - 3);
       await harshal.save();
       console.log('Decremented Harshal recruit counts.');
    }

    console.log('Cleanup completed.');
  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
