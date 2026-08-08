const mongoose = require('mongoose');
const Sale = require('./src/models/Sale').default;
const Wallet = require('./src/models/Wallet').default;
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const saleId = '6a54a9050a34916e2d9c670d';
  const vinodId = '6a5b67f50a90779a33c7ecec'; // CB-HBA-1001

  // Set the sale amount to 589900 (5,899 INR) which is the typical price for Sampoorna Suraksha Plus
  await Sale.updateOne(
    { _id: saleId },
    { $set: { saleAmount: 589900, businessVolume: 589900 } }
  );

  // We need to add a ledger entry in Vinod's wallet so the frontend finds it.
  const wallet = await Wallet.findOne({ user: vinodId });
  if (wallet) {
    const exists = wallet.ledger.some(l => l.saleId && l.saleId.toString() === saleId);
    if (!exists) {
      wallet.ledger.push({
        amount: 92754, // 927.54 INR
        type: 'direct',
        status: 'provisional',
        description: 'Commission for sale CB-SSP-02',
        saleId: saleId,
        cycleMonth: '2026-06',
        date: new Date()
      });
      await wallet.save();
    }
  }

  console.log("Fixed saleAmount and added ledger entry");
  process.exit(0);
});
