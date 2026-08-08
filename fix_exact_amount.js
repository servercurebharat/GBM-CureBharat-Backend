const mongoose = require('mongoose');
const Sale = require('./src/models/Sale').default;
const Wallet = require('./src/models/Wallet').default;
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const saleId = '6a54a9050a34916e2d9c670d';
  const vinodId = '6a5b67f50a90779a33c7ecec'; // CB-HBA-1001

  // Set the correct sale amount to 471882 paise (4718.82 with GST) or 399900 base? 
  // We'll set it to 471882 for total amount paid.
  await Sale.updateOne(
    { _id: saleId },
    { $set: { saleAmount: 471882, businessVolume: 399900 } }
  );

  // Update Vinod's wallet ledger with the correct 40% direct commission on 3999
  const commissionAmount = 159960; // 1599.60 INR

  const wallet = await Wallet.findOne({ user: vinodId });
  if (wallet) {
    const entryIndex = wallet.ledger.findIndex(l => l.saleId && l.saleId.toString() === saleId);
    if (entryIndex !== -1) {
      wallet.ledger[entryIndex].amount = commissionAmount;
    } else {
      wallet.ledger.push({
        amount: commissionAmount,
        type: 'direct',
        status: 'provisional',
        description: 'Commission for sale CB-SSP-02',
        saleId: saleId,
        cycleMonth: '2026-06',
        date: new Date()
      });
    }
    
    // Recalculate total Earned
    wallet.totalEarned = wallet.ledger
      .filter(l => l.type !== 'withdrawal' && l.type !== 'tds_deduction')
      .reduce((sum, l) => sum + l.amount, 0);
      
    await wallet.save();
  }

  console.log("Fixed saleAmount to 4718.82 and commission to 1599.60");
  process.exit(0);
});
