import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Wallet = mongoose.model('Wallet', new mongoose.Schema({}, { strict: false }));

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const harshalId = new mongoose.Types.ObjectId('6a0aaaef6d3b091c6edbd022');
    const wallet: any = await Wallet.findOne({ user: harshalId });

    if (!wallet) {
      console.log('Wallet not found!');
      return;
    }

    const ledger: any[] = wallet.get('ledger');
    console.log(`Total ledger entries: ${ledger.length}`);

    // Find the specific entry: Jun 5 2026, direct type, ~800 amount, description includes CB-ADMIN-0003
    const targetEntry = ledger.find((l: any) => {
      const d = new Date(l.date);
      const isJune5 = d >= new Date('2026-06-05T00:00:00') && d < new Date('2026-06-06T00:00:00');
      const isDirectAdmin = l.type === 'direct' && l.description && l.description.includes('CB-ADMIN-0003');
      return isJune5 && isDirectAdmin;
    });

    if (!targetEntry) {
      console.log('Target transaction not found. Listing all ledger entries:');
      ledger.forEach((l: any, i: number) => {
        console.log(`  [${i}] date=${l.date} | type=${l.type} | amount=${l.amount} | status=${l.status} | desc=${l.description?.substring(0, 60)}`);
      });
      return;
    }

    console.log(`Found target entry:`);
    console.log(`  date=${targetEntry.date} | type=${targetEntry.type} | amount=${targetEntry.amount} | status=${targetEntry.status}`);
    console.log(`  desc=${targetEntry.description}`);

    // Remove the entry
    const newLedger = ledger.filter((l: any) => l !== targetEntry);

    // Adjust wallet balance
    let provisionalAdj = 0;
    let finalAdj = 0;
    if (targetEntry.status === 'provisional') provisionalAdj = targetEntry.amount;
    else if (targetEntry.status === 'final') finalAdj = targetEntry.amount;

    wallet.set('ledger', newLedger);
    wallet.set('provisionalBalance', Math.max(0, wallet.get('provisionalBalance') - provisionalAdj));
    wallet.set('finalBalance', Math.max(0, wallet.get('finalBalance') - finalAdj));
    wallet.set('totalEarned', Math.max(0, wallet.get('totalEarned') - (provisionalAdj + finalAdj)));

    await wallet.save();
    console.log(`✅ Transaction deleted. Wallet balances adjusted by -₹${(provisionalAdj + finalAdj) / 100}.`);
  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

run();
