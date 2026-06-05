import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const WalletSchema = new mongoose.Schema({}, { strict: false });
const Wallet = mongoose.model('Wallet', WalletSchema);

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

const SaleSchema = new mongoose.Schema({}, { strict: false });
const Sale = mongoose.model('Sale', SaleSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const allWallets = await Wallet.find({});
  for (const w of allWallets) {
    let modified = false;
    const wAny = w as any;
    if (wAny.ledger && Array.isArray(wAny.ledger)) {
      for (const entry of wAny.ledger) {
        let saleDate = null;
        
        // 1. Try to extract Policy Number from description
        const desc = entry.description || '';
        const match = desc.match(/CB-POL-\d+-\d+/);
        if (match) {
          const policyNo = match[0];
          const sale = await Sale.findOne({ policyNo }) as any;
          if (sale && sale.createdAt) {
            saleDate = sale.createdAt;
          }
        }
        
        // 2. If no sale found from description, fallback to sourceUserId's joiningDate
        if (!saleDate && entry.sourceUserId) {
          const sourceUser = await User.findById(entry.sourceUserId) as any;
          if (sourceUser && sourceUser.joiningDate) {
            saleDate = sourceUser.joiningDate;
          }
        }
        
        if (saleDate && entry.date.getTime() !== saleDate.getTime()) {
          entry.date = saleDate;
          entry.cycleMonth = saleDate.toISOString().slice(0, 7);
          modified = true;
        }
      }
    }
    
    if (modified) {
      // mongoose won't detect deeply nested changes inside untyped mixed arrays unless we mark modified
      wAny.markModified('ledger');
      await wAny.save();
      console.log(`Synced dates for wallet ${w._id}`);
    }
  }

  console.log('Done!');
  mongoose.disconnect();
}

run();
