import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './src/models/User';
import Sale from './src/models/Sale';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    const hcm = await User.findOne({ name: /HJ Finance/i });
    if (!hcm) {
      console.log('HJ Finance not found!');
      process.exit(0);
    }

    // Check if Dipak already exists
    let dipak = await User.findOne({ mobile: '9427445685' });
    if (!dipak) {
      // Generate a new HCC member ID
      const count = await User.countDocuments({ role: 'hcc' });
      const memberId = `CB-HCC-${1000 + count + 1}`;

      dipak = new User({
        name: 'Dipak kumar Parsania',
        mobile: '9427445685',
        email: 'dipakparsania2021@gmail.com',
        role: 'hcc',
        rank: 'HCC',
        memberId,
        referrerId: hcm._id,
        state: 'Gujarat',
        password: 'password123', // Will be hashed automatically by pre-save hook
      });
      await dipak.save();
      console.log(`Created new HCC: ${dipak.name} (${dipak.memberId}) under ${hcm.name}`);
    } else {
      // Update existing if any
      dipak.referrerId = hcm._id;
      dipak.role = 'hcc';
      dipak.rank = 'HCC';
      await dipak.save();
      console.log(`Updated existing user ${dipak.name} as HCC under ${hcm.name}`);
    }

    // Now re-map the sale to Dipak
    const sale = await Sale.findOne({ customerMobile: '9427445685' }).sort({ createdAt: -1 });
    if (sale) {
      sale.sellerId = dipak._id;
      sale.sellerMemberId = dipak.memberId;
      await sale.save();
      console.log(`Re-mapped Sale ${sale.policyId} to seller ${dipak.name} (${dipak.memberId})`);
    } else {
      console.log('Sale not found to remap.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
