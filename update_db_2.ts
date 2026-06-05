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

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const punitHba = await User.findOne({ memberId: 'CB-HBA-1000' });
    const nirmish = await User.findOne({ memberId: 'CB-HCM-1002' });
    const vijay = await User.findOne({ memberId: 'CB-HCC-1001' });

    if (!punitHba) console.log('punitHba not found');
    if (!nirmish) console.log('nirmish not found');
    if (!vijay) console.log('vijay not found');

    if (punitHba && nirmish && vijay) {
      nirmish.sponsor = punitHba._id;
      await nirmish.save();
      console.log(`Hierarchy updated: Nirmish sponsor set to Punit Sata HBA`);

      vijay.sponsor = nirmish._id;
      await vijay.save();
      console.log(`Hierarchy updated: Vijay Makwana sponsor set to Nirmish`);
    }

    const updates = [
      { memberId: 'CB-HCM-1001', joinDate: '2026-04-17T00:00:00Z', saleCustName: 'HJ Finance' },
      { memberId: 'CB-HCM-1002', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Nirmish' },
      { memberId: 'CB-HCM-1000', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Punit Sata' },
      { memberId: 'CB-HCC-1000', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Jaysukhbhai Sonchhatra' },
      { memberId: 'CB-HCC-1001', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Vijay Makwana' },
      { memberId: 'CB-HCM-1003', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Amit Mishra' },
      { memberId: 'CB-HCC-1002', joinDate: '2026-04-23T00:00:00Z', saleCustName: 'Mayur Karia' },
      { memberId: 'CB-HCC-1003', joinDate: '2026-04-23T00:00:00Z', saleCustName: 'Karan Miyatra' },
      { memberId: 'CB-HCM-1004', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Siddharth Shrivastava' },
      { memberId: 'CB-HCC-1004', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Siddharth Shrivastava- Self', custFind: 'Siddharth Shrivastava- Self' },
      { memberId: 'CB-HCC-1005', joinDate: '2026-04-27T00:00:00Z', saleCustName: 'Neeraj Gupta- Self', custFind: 'Neeraj Gupta- Self' },
      { memberId: 'CB-HCC-1006', joinDate: '2026-04-27T00:00:00Z', saleCustName: 'Lavish Kulkarni- Self', custFind: 'Lavish Kulkarni- Self' },
      { memberId: 'CB-HCC-1007', joinDate: '2026-05-15T00:00:00Z', saleCustName: 'Karan Miyatra' },
      { memberId: 'CB-HCC-1008', joinDate: '2026-05-21T00:00:00Z', saleCustName: 'Kapil Dube- Self', custFind: 'Kapil Dube- Self' },
    ];

    for (const data of updates) {
      const joiningDate = new Date(data.joinDate);
      const user = await User.findOne({ memberId: data.memberId });
      if (user) {
        user.joiningDate = joiningDate;
        user.createdAt = joiningDate;
        await user.save();
        console.log(`Updated User: ${user.name}`);
      }
      
      const sales = await Sale.find({ customerName: new RegExp('^' + (data.custFind || data.saleCustName).replace(/-/g, '\\-') + '$', 'i') }).sort({ createdAt: 1 });
      if (sales.length > 0) {
        let s = sales[0];
        if (sales.length > 1 && data.memberId === 'CB-HCC-1007') s = sales[1];
        s.createdAt = joiningDate;
        await s.save();
        console.log(`Updated Sale: ${s.customerName}`);
      }
    }

  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
