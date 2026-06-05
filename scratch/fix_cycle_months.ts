import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Sale = mongoose.model('Sale', new mongoose.Schema({}, { strict: false }));
const Wallet = mongoose.model('Wallet', new mongoose.Schema({}, { strict: false }));

// Map policyId → correct cycleMonth (YYYY-MM) based on the corrected createdAt dates
const cycleMonthFixes: { policyId: string; customer: string; correctCycleMonth: string }[] = [
  { policyId: 'CB-POL-1780400165968-1974', customer: 'Nirmish Acharya',           correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780405013901-4562', customer: 'Anandkumar kalal',           correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780407028010-4157', customer: 'Karan Miyatra (Apr)',         correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780407220667-8622', customer: 'Neeraj Gupta',               correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780407529622-8600', customer: 'Lavish Kulkarni',            correctCycleMonth: '2026-04' },
  // Already correct below - but verifying
  { policyId: 'CB-POL-1780399616755-6806', customer: 'HJ Finance (Apr 17)',        correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780401730954-7350', customer: 'Punit Sata (Apr 21)',        correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780402349647-8344', customer: 'Jaysukhbhai (Apr 21)',       correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780403522191-8599', customer: 'Vijay Makwana (Apr 22)',     correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780406491928-4770', customer: 'Amit Mishra (Apr 22)',       correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780406934619-1771', customer: 'Mayur Karia (Apr 23)',       correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780407119040-2339', customer: 'Siddharth Shrivastava',     correctCycleMonth: '2026-04' },
  { policyId: 'CB-POL-1780407700050-2794', customer: 'Kapil Dube (May 21)',        correctCycleMonth: '2026-05' },
  { policyId: 'CB-POL-1780496732665-5754', customer: 'Abhay Sonchhatra (May 21)',  correctCycleMonth: '2026-05' },
  { policyId: 'CB-POL-1780497448391-4123', customer: 'Yagnik Sabhaya (May 15)',    correctCycleMonth: '2026-05' },
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    for (const fix of cycleMonthFixes) {
      // 1. Fix Sale cycleMonth
      const sale: any = await Sale.findOne({ policyId: fix.policyId });
      if (!sale) { console.log(`❌ Sale not found: ${fix.policyId}`); continue; }
      
      const oldCycleMonth = sale.get('cycleMonth');
      if (oldCycleMonth !== fix.correctCycleMonth) {
        await Sale.updateOne({ policyId: fix.policyId }, { $set: { cycleMonth: fix.correctCycleMonth } });
        console.log(`✅ Sale cycleMonth: ${fix.policyId} (${fix.customer}) ${oldCycleMonth} → ${fix.correctCycleMonth}`);
        
        // 2. Fix wallet ledger entries that reference this policy
        const walletsToFix = await Wallet.find({
          'ledger.description': { $regex: fix.policyId }
        });
        
        for (const wallet of walletsToFix) {
          const ledger: any[] = wallet.get('ledger');
          let updated = false;
          
          for (const entry of ledger) {
            if (entry.description && entry.description.includes(fix.policyId)) {
              if (entry.cycleMonth !== fix.correctCycleMonth) {
                entry.cycleMonth = fix.correctCycleMonth;
                updated = true;
              }
            }
          }
          
          if (updated) {
            wallet.set('ledger', ledger);
            await wallet.save();
            console.log(`   → Updated wallet ledger for user ${wallet.get('user')}`);
          }
        }
      } else {
        console.log(`✓ Already correct: ${fix.policyId} (${fix.correctCycleMonth})`);
      }
    }

    console.log('\n✅ All cycleMonth values corrected!');
  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

run();
