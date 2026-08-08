import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/curebharat').then(async () => {
  const result = await User.updateOne(
    { name: 'Virendra Thakkar' },
    { $set: { memberId: 'CB-HCC-1009' } }
  );
  console.log('Updated Virendra Thakkar ID:', result);
  process.exit(0);
});
