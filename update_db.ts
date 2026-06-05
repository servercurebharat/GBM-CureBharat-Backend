import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  name: String,
  memberId: String,
  role: String,
  joiningDate: Date,
  createdAt: Date,
  sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: false });

const SaleSchema = new mongoose.Schema({
  customerName: String,
  createdAt: Date,
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: false });

const User = mongoose.model('User', UserSchema);
const Sale = mongoose.model('Sale', SaleSchema);

const updates = [
  { name: 'HJ Finance', memberId: 'CB-HCM-1001', joinDate: '2026-04-17T00:00:00Z', saleCustName: 'HJ Finance' },
  { name: 'Nirmish', memberId: 'CB-HCM-1002', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Nirmish' },
  { name: 'Punit Sata', memberId: 'CB-HCM-1000', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Punit Sata' },
  { name: 'Jaysukhbhai Sonchhatra', memberId: 'CB-HCC-1000', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Jaysukhbhai Sonchhatra' },
  { name: 'Vijay Makwana', memberId: 'CB-HCC-1001', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Vijay Makwana' },
  { name: 'Amit Mishra', memberId: 'CB-HCM-1003', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Amit Mishra' },
  // Row 8: HJ Finance - Sampoorna Surksha Premium - no new user, just sale maybe? Let's check sales.
  { name: 'Mayur Karia', memberId: 'CB-HCC-1002', joinDate: '2026-04-23T00:00:00Z', saleCustName: 'Mayur Karia' },
  { name: 'Karan Miyatra', memberId: 'CB-HCC-1003', joinDate: '2026-04-23T00:00:00Z', saleCustName: 'Karan Miyatra', saleDate: '2026-04-23T00:00:00Z' },
  { name: 'Siddharth Shrivastava', memberId: 'CB-HCM-1004', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Siddharth Shrivastava' },
  { name: 'Siddharth Shrivastava- Self', memberId: 'CB-HCC-1004', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Siddharth Shrivastava- Self' },
  { name: 'Neeraj Gupta- Self', memberId: 'CB-HCC-1005', joinDate: '2026-04-27T00:00:00Z', saleCustName: 'Neeraj Gupta- Self' },
  { name: 'Lavish Kulkarni- Self', memberId: 'CB-HCC-1006', joinDate: '2026-04-27T00:00:00Z', saleCustName: 'Lavish Kulkarni- Self' },
  { name: 'Karan Miyatra', memberId: 'CB-HCC-1007', joinDate: '2026-05-15T00:00:00Z', saleCustName: 'Karan Miyatra', saleDate: '2026-05-15T00:00:00Z' },
  { name: 'Kapil Dube- Self', memberId: 'CB-HCC-1008', joinDate: '2026-05-21T00:00:00Z', saleCustName: 'Kapil Dube- Self' },
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    // Update dates
    for (const data of updates) {
      const joiningDate = new Date(data.joinDate);
      
      let userQuery: any = { name: new RegExp('^' + data.name + '$', 'i') };
      if (data.memberId) userQuery.memberId = data.memberId;
      
      const user = await User.findOne(userQuery);
      if (user) {
        user.joiningDate = joiningDate;
        user.createdAt = joiningDate;
        await user.save();
        console.log(`Updated User: ${user.name} to ${joiningDate}`);
      } else {
        console.log(`User NOT FOUND: ${data.name}`);
      }

      const saleOptions: any = { customerName: new RegExp('^' + data.saleCustName + '$', 'i') };
      // Some customers have multiple entries, try to sort by createdAt
      const sales = await Sale.find(saleOptions).sort({ createdAt: 1 });
      if (sales.length > 0) {
        let saleToUpdate = sales[0];
        if (data.saleDate) {
          // Find the sale closest to data.saleDate if multiple
           const targetDate = new Date(data.saleDate);
           if (sales.length > 1 && data.name === 'Karan Miyatra') {
             // For Karan Miyatra, he has two policies, 23 Apr and 15 May
             if (data.memberId === 'CB-HCC-1003') saleToUpdate = sales[0]; // First one
             if (data.memberId === 'CB-HCC-1007') saleToUpdate = sales[1]; // Second one
           }
        }
        saleToUpdate.createdAt = joiningDate;
        await saleToUpdate.save();
        console.log(`Updated Sale: ${saleToUpdate.customerName} to ${joiningDate}`);
      } else {
        console.log(`Sale NOT FOUND: ${data.saleCustName}`);
      }
    }

    // Now fix hierarchy for Nirmish and Vijay Makwana
    const punitHba = await User.findOne({ memberId: 'CB-HBA-1000' });
    const nirmish = await User.findOne({ memberId: 'CB-HCM-1002' });
    const vijay = await User.findOne({ memberId: 'CB-HCC-1001' });

    if (punitHba && nirmish && vijay) {
      nirmish.sponsor = punitHba._id;
      await nirmish.save();
      console.log(`Hierarchy updated: Nirmish sponsor set to Punit Sata HBA`);

      vijay.sponsor = nirmish._id;
      await vijay.save();
      console.log(`Hierarchy updated: Vijay Makwana sponsor set to Nirmish`);
    } else {
      console.log('Could not find all users for hierarchy fix.');
    }

  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
