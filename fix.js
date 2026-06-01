require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Wallet = mongoose.connection.collection('wallets');
  await Wallet.updateMany({}, { $pull: { ledger: { description: /CB-POL-1780228482497-5476/ } } });
  
  const Sale = mongoose.connection.collection('sales');
  await Sale.updateOne({ policyId: 'CB-POL-1780228482497-5476' }, { $set: { commissionProcessed: false, businessVolume: 280000 } });
  
  const Plan = mongoose.connection.collection('plans');
  await Plan.updateOne({ _id: new mongoose.Types.ObjectId('6a1abf6fee3a83d8e54ca1b7') }, { $set: { businessVolume: 280000 } });
  
  console.log('Fixed DB');
  process.exit(0);
}).catch(console.error);
