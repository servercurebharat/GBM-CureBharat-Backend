import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User from './src/models/User';
import Sale from './src/models/Sale';

dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  // Fix users
  const res1 = await User.updateMany({ state: 'MP' }, { $set: { state: 'Madhya Pradesh' } });
  console.log('Updated users with MP -> Madhya Pradesh:', res1);

  // Fix sales
  const res2 = await Sale.updateMany({ customerState: 'MP' }, { $set: { customerState: 'Madhya Pradesh' } });
  console.log('Updated sales with MP -> Madhya Pradesh:', res2);
  
  process.exit(0);
}

fix().catch(console.error);
