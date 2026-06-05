import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const WalletSchema = new mongoose.Schema({}, { strict: false });
const Wallet = mongoose.model('Wallet', WalletSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const w = await Wallet.findOne({ 'ledger.0': { $exists: true } });
  const wAny = w as any;
  console.dir(wAny?.toObject().ledger[0], { depth: null });
  console.dir(wAny?.toObject().ledger[1], { depth: null });

  mongoose.disconnect();
}

run();
