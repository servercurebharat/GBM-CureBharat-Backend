const mongoose = require('mongoose');
const Sale = require('./src/models/Sale').default;
const User = require('./src/models/User').default;
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const vinod = await User.findOne({ memberId: 'CB-HBA-1001' });
  const tarun = await User.findOne({ memberId: 'CB-HCM-1005' });
  const sales = await Sale.find({ 
    $or: [
      { customerName: /Tarun/i }, 
      { sellerId: vinod?._id }, 
      { sellerId: tarun?._id }
    ] 
  });
  console.log(JSON.stringify(sales, null, 2));
  process.exit(0);
});
