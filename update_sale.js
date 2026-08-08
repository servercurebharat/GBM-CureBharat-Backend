const mongoose = require('mongoose');
const Sale = require('./src/models/Sale').default;
const User = require('./src/models/User').default;
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const vinod = await User.findOne({ memberId: 'CB-HBA-1001' });
  const result = await Sale.updateOne(
    { policyId: 'CB-SSP-02' },
    { 
      $set: { 
        sellerId: vinod._id, 
        sellerMemberId: vinod.memberId,
        hbaId: vinod._id
      } 
    }
  );
  
  // Now recalculate Vinod's direct sales count
  const directSalesCount = await Sale.countDocuments({ sellerId: vinod._id, status: 'active' });
  await User.updateOne({ _id: vinod._id }, { $set: { personalSalesCount: directSalesCount } });
  
  console.log("Sale updated!", result);
  process.exit(0);
});
