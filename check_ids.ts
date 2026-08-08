import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/curebharat').then(async () => {
  const users = await User.find({ role: 'hcc' }).sort({ createdAt: -1 });
  users.forEach(u => console.log(`${u.name}: ${u.memberId}`));
  process.exit(0);
});
