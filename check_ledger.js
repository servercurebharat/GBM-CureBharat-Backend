const mongoose = require('mongoose');
const Wallet = require('./src/models/Wallet').default;
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const vinodId = '6a5b67f50a90779a33c7ecec';
  const wallet = await Wallet.findOne({ user: vinodId }).lean();
  console.log(JSON.stringify(wallet.ledger, null, 2));
  process.exit(0);
});
