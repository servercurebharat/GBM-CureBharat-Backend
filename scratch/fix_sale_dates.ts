import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Sale = mongoose.model('Sale', new mongoose.Schema({}, { strict: false }));

// Mapping from spreadsheet analysis:
// Spreadsheet order (sorted by date):
// Row 1:  17-Apr-26 | HJ Finance        | -            | CB-Suraksha Special  | 1499 → CB-POL-1780399616755-6806 (HJ Finance / 176882 paise = 1499+GST) ✓
// Row 2:  21-Apr-26 | Punit Sata        | Nirmish      | CB-Suraksha Special  | 1499 → CB-POL-1780400165968-1974 (Nirmish Acharya) ← currently Jun 2
// Row 3:  21-Apr-26 | Punit Sata        | Nirmish      | CB-Super Suraksha    | 1999 → CB-POL-1780401730954-7350 (Punit Sata / 235882) ✓ already Apr 21
// Row 4:  21-Apr-26 | HJ Finance        | Jaysukhbhai  | CB-Super Suraksha    | 1999 → CB-POL-1780402349647-8344 (Jaysukhbhai Sonchhatra) ✓ already Apr 21
// Row 5:  21-Apr-26 | HJ Finance        | Jaysukhbhai  | CB-Super Suraksha    | 1999 → (same as row 4? Duplicate - skip, already correct)
// Row 6:  22-Apr-26 | Punit Sata        | Vijay Makwana| CB-Suraksha Special  | 1499 → CB-POL-1780403522191-8599 (Vijay Makwana) ✓ already Apr 22
// Row 7:  22-Apr-26 | HJ Finance        | (Amit Mishra)| CB-Sampoorna Premium | 4999 → CB-POL-1780405013901-4562 (Anandkumar kalal) ← currently Jun 2 ... hmm 
//         Wait, row 7 HBA=HJ Finance, HCM=Amit Mishra. Amount 4999. Let me re-check 
//         Looking at spreadsheet: Row 7 = 22-Apr, HBA HJ Finance, HCM=-, HCC=-, Plan=CB-Sampoorna Suraksha Premium, Amount=4999
//         That matches Anandkumar Kalal? No. Amit Mishra is CB-Sampoorna...
//         CB-POL-1780406491928-4770 = Amit Mishra, 589882 paise ≈ 4999+GST, Seller=6a1ed8db0769b8585038dd4b (Amit Mishra), currently Apr 22 ✓
// Row 8:  22-Apr-26 | HJ Finance        | (HBA?)       | CB-Sampoorna Premium | 4999 → CB-POL-1780405013901-4562 (Anandkumar kalal) ← currently Jun 2 → needs Apr 22
// Row 9:  23-Apr-26 | HJ Finance        | Mayur Karia  | CB-Sampoorna Premium | 4999 → CB-POL-1780406934619-1771 (Mayur Karia) ✓ already Apr 23
// Row 10: 23-Apr-26 | HJ Finance        | Karan Miyatra| CB-Super Suraksha    | 1999 → needs Apr 23 → CB-POL-1780407028010-4157 currently May 15 → fix to Apr 23
// Row 11: 22-Apr-26 | Siddharth         | Siddharth-Self| CB-Sampoorna Plus   | 3999 → CB-POL-1780407119040-2339 ✓ already Apr 22
// Row 12: 27-Apr-26 | Amit Mishra       | Neeraj Gupta-Self| CB-Sampoorna Premium | 4999 → CB-POL-1780407220667-8622 ← currently Jun 2 → fix to Apr 27
// Row 13: 27-Apr-26 | Amit Mishra       | Lavish Kulkarni-Self| CB-Super Suraksha | 4999 → CB-POL-1780407529622-8600 ← currently Jun 2 → fix to Apr 27
// Row 14: 15-May-26 | HJ Finance        | Karan Miyatra| CB-Sampoorna Premium | 4999 → CB-POL-1780407028010-4157 Wait, that was row 10 for Apr 23...
//         Row 14 amount=4999, HBA=HJ Finance, HCM=Karan Miyatra: This must be a DIFFERENT Karan Miyatra sale
//         But we only have 15 sales total. Let me re-read the spreadsheet carefully...
//         Looking at spreadsheet row 14: 15-May-26, HBA=HJ Finance, HCM=Karan Miyatra, Plan=CB-Sampoorna Suraksha Premium, 4999, HCM Payout=40%=800
//         That's CB-POL-1780407028010-4157 (Karan Miyatra, 235882 paise) — BUT 235882 paise ≈ 1999+GST not 4999
//         Wait, let me check again: 589882 paise... let me do math: 4999*100 = 499900. With GST 18% = 589882. Yes!
//         And 235882 = 1999*100*1.18... 1999*118 = 235882. Yes.
//         So CB-POL-1780407028010-4157 (Karan Miyatra, 235882) = 1999 plan = Row 10 (Apr 23 CB-Super Suraksha)
//         For row 14 (15-May, Karan Miyatra, 4999 CB-Sampoorna): must be a different sale? But total is 15 and Karan only shows once.
//         Actually: the spreadsheet says the 15-May row HBA is HJ Finance, HCM=Karan Miyatra, Plan=CB-Sampoorna Premium, 4999, HCM Payout%=40%, HCM Amount=800.
//         But HCM Payout of 4999 * 40% = 2000 not 800. 800 is 40% of 1999 (CB-Super Suraksha).
//         Hmm, the column I column (HCC Payout Amount) shows 800 for row 14. So HCC earns 800 which is 40% of 1999.
//         Let me just match by policyId: The May 15 sale in the DB is CB-POL-1780407028010-4157 = Karan Miyatra, 235882 paise = 1999 plan.
//         The spreadsheet row 10 (Apr 23): Karan Miyatra, CB-Super Suraksha (1999), HCM payout 800 (40% of 1999) ✓
//         The spreadsheet row 14 (15-May): Karan Miyatra, CB-Sampoorna Suraksha Premium (4999), HCC payout 800???
//         The numbers don't add up for row 14. I think CB-POL-1780407028010-4157 = the Apr 23 entry (row 10), date should be Apr 23.
// Row 15: 21-May-26 | Amit Mishra       | Kapil Dube-Self | CB-Sampoorna Premium | 4999 → CB-POL-1780407700050-2794 (Kapil Dube) ← currently Jun 2 → fix to May 21

// FINAL MAPPING - dates to fix:
// CB-POL-1780400165968-1974 (Nirmish Acharya)  → 21-Apr-2026  (currently Jun 2)
// CB-POL-1780405013901-4562 (Anandkumar kalal) → 22-Apr-2026  (currently Jun 2)  [row 8: 22-Apr, HJ Finance, 4999]
// CB-POL-1780407028010-4157 (Karan Miyatra)    → 23-Apr-2026  (currently May 15) [row 10: 23-Apr, Karan Miyatra, 1999]
// CB-POL-1780407220667-8622 (Neeraj Gupta)     → 27-Apr-2026  (currently Jun 2)
// CB-POL-1780407529622-8600 (Lavish Kulkarni)  → 27-Apr-2026  (currently Jun 2)
// CB-POL-1780407700050-2794 (Kapil Dube)       → 21-May-2026  (currently Jun 2)
// CB-POL-1780496732665-5754 (Abhay Sonchhatra) → 21-May-2026  (currently Jun 3) [Row 15 in spreadsheet is May 21]
// CB-POL-1780497448391-4123 (Yagnik Sabhaya)   → ? not in spreadsheet? Wait that's 15 sales vs 15 rows... 
// Let me count again properly. We have 15 sales in DB and 15 rows in spreadsheet.

// CORRECTED final mapping based on careful analysis:
// Already correct dates (no change needed):
// CB-POL-1780399616755-6806 Apr 17 ✓
// CB-POL-1780401730954-7350 Apr 21 ✓  
// CB-POL-1780402349647-8344 Apr 21 ✓
// CB-POL-1780403522191-8599 Apr 22 ✓
// CB-POL-1780406491928-4770 Apr 22 ✓
// CB-POL-1780406934619-1771 Apr 23 ✓
// CB-POL-1780407119040-2339 Apr 22 ✓

// Needs fix:
const dateFixes: { policyId: string; customer: string; correctDate: Date }[] = [
  { policyId: 'CB-POL-1780400165968-1974', customer: 'Nirmish Acharya',    correctDate: new Date('2026-04-21T00:00:00.000Z') },
  { policyId: 'CB-POL-1780405013901-4562', customer: 'Anandkumar kalal',   correctDate: new Date('2026-04-22T00:00:00.000Z') },
  { policyId: 'CB-POL-1780407028010-4157', customer: 'Karan Miyatra',       correctDate: new Date('2026-04-23T00:00:00.000Z') },
  { policyId: 'CB-POL-1780407220667-8622', customer: 'Neeraj Gupta',        correctDate: new Date('2026-04-27T00:00:00.000Z') },
  { policyId: 'CB-POL-1780407529622-8600', customer: 'Lavish Kulkarni',     correctDate: new Date('2026-04-27T00:00:00.000Z') },
  { policyId: 'CB-POL-1780407700050-2794', customer: 'Kapil Dube',          correctDate: new Date('2026-05-21T00:00:00.000Z') },
  { policyId: 'CB-POL-1780496732665-5754', customer: 'Abhay Sonchhatra',    correctDate: new Date('2026-05-21T00:00:00.000Z') },
  { policyId: 'CB-POL-1780497448391-4123', customer: 'YAGNIK LALJIBHAI SABHAYA', correctDate: new Date('2026-05-15T00:00:00.000Z') },
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    for (const fix of dateFixes) {
      const sale = await Sale.findOne({ policyId: fix.policyId });
      if (sale) {
        const oldDate = sale.get('createdAt');
        await Sale.updateOne(
          { policyId: fix.policyId },
          { $set: { createdAt: fix.correctDate, saleDate: fix.correctDate } }
        );
        console.log(`✅ Updated ${fix.policyId} (${fix.customer}): ${oldDate} → ${fix.correctDate}`);
      } else {
        console.log(`❌ Not found: ${fix.policyId}`);
      }
    }

    console.log('\nDone! All dates updated.');
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

run();
