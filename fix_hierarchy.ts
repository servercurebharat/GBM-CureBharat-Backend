import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  name: String,
  memberId: String,
  role: String,
  rank: String,
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const punit = await User.findOne({ memberId: 'CB-HCM-1002' }); // Punit Sata
  const nirmish = await User.findOne({ memberId: 'CB-HCM-1001' }); // Nirmish Acharya
  const vijay = await User.findOne({ memberId: 'CB-HCC-1001' }); // Vijay Makwana

  if (punit) {
    punit.role = 'hba';
    punit.rank = 'HBA';
    // Let's use CB-HBA-1002 to match the suffix, or just CB-HBA-1000 since there isn't one
    punit.memberId = 'CB-HBA-1000';
    punit.referrerId = null;
    await punit.save();
    console.log('Updated Punit Sata to HBA (CB-HBA-1000)');
  } else {
    // Maybe he's already CB-HBA-1000?
    const existingPunit = await User.findOne({ memberId: 'CB-HBA-1000' });
    if (existingPunit) {
        console.log('Punit is already CB-HBA-1000');
    } else {
        console.log('Punit Sata not found');
    }
  }

  // Refetch punit just in case
  const updatedPunit = await User.findOne({ memberId: 'CB-HBA-1000' });

  if (nirmish && updatedPunit) {
    nirmish.referrerId = updatedPunit._id;
    await nirmish.save();
    console.log('Updated Nirmish sponsor to Punit');
  }

  if (vijay && nirmish) {
    vijay.referrerId = nirmish._id;
    await vijay.save();
    console.log('Updated Vijay sponsor to Nirmish');
  }

  mongoose.disconnect();
}

run();
