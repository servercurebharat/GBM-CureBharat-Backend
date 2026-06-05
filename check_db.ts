import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

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
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const users = await User.find({ name: { $in: [
    /HJ Finance/i, /Punit Sata/i, /Nirmish/i, /Vijay Makwana/i, /Amit Mishra/i, /Mayur Karia/i, /Karan Miyatra/i, /Siddharth Shrivastava/i, /Neeraj Gupta/i, /Lavish Kulkarni/i, /Kapil Dube/i, /Jaysukhbhai/i
  ]}});
  
  console.log('USERS:');
  users.forEach(u => console.log(`- ${u.name} | ${u.memberId} | ID: ${u._id} | sponsor: ${u.sponsor}`));

  const sales = await Sale.find({ customerName: { $in: [
    /HJ Finance/i, /Punit Sata/i, /Nirmish/i, /Vijay Makwana/i, /Amit Mishra/i, /Mayur Karia/i, /Karan Miyatra/i, /Siddharth Shrivastava/i, /Neeraj Gupta/i, /Lavish Kulkarni/i, /Kapil Dube/i, /Jaysukhbhai/i
  ]}});
  
  console.log('\nSALES:');
  sales.forEach(s => console.log(`- ${s.customerName} | seller: ${s.seller} | ID: ${s._id}`));

  mongoose.disconnect();
}

run();
