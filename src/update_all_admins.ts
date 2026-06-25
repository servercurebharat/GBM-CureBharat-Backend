import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in env');

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Update all users with role 'admin'
    const result = await User.updateMany(
      { role: 'admin' },
      { $set: { email: 'harshalsynture@gmail.com' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} admin users in the database.`);

    const admins = await User.find({ role: 'admin' }).select('name email mobile memberId');
    console.log('Current Admin Status in DB:', admins);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error updating admins:', error);
  }
}

run();
