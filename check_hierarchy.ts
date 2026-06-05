import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  name: String,
  memberId: String,
  role: String,
  sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const punit = await User.find({ name: /Punit/i });
  const nirmish = await User.find({ name: /Nirmish/i });
  const vijay = await User.find({ name: /Vijay/i });
  const id1000 = await User.find({ memberId: 'CB-HBA-1000' });
  const id1002 = await User.find({ memberId: 'CB-HCM-1002' });

  console.log('--- Punit ---');
  punit.forEach(u => console.log(`${u.name} | ${u.memberId} | ${u.role} | sponsor: ${u.sponsor}`));
  console.log('--- Nirmish ---');
  nirmish.forEach(u => console.log(`${u.name} | ${u.memberId} | ${u.role} | sponsor: ${u.sponsor}`));
  console.log('--- Vijay ---');
  vijay.forEach(u => console.log(`${u.name} | ${u.memberId} | ${u.role} | sponsor: ${u.sponsor}`));
  console.log('--- By ID ---');
  id1000.forEach(u => console.log(`${u.name} | ${u.memberId} | ${u.role} | sponsor: ${u.sponsor}`));
  id1002.forEach(u => console.log(`${u.name} | ${u.memberId} | ${u.role} | sponsor: ${u.sponsor}`));

  mongoose.disconnect();
}

run();
