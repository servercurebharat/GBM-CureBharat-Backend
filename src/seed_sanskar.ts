import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User';
import Wallet from './models/Wallet';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in env');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const plainPassword = '123456789';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 1. Check if user already exists
    let user = await User.findOne({ mobile: '8269210100' });
    if (user) {
      user.name = 'Sanskar Namdev';
      user.email = 'namdevsanskar2000@gmail.com';
      user.password = hashedPassword; // Encrypted password
      user.role = 'admin';
      user.rank = 'ADMIN';
      user.status = 'active';
      user.kycStatus = 'approved';
      user.state = 'Maharashtra';
      await user.save();
      console.log('✅ Admin user updated with hashed password successfully:', user.mobile);
    } else {
      user = await User.create({
        name: 'Sanskar Namdev',
        mobile: '8269210100',
        email: 'namdevsanskar2000@gmail.com',
        password: hashedPassword, // Encrypted password
        role: 'admin',
        rank: 'ADMIN',
        memberId: 'CB-ADMIN-0002',
        state: 'Maharashtra',
        status: 'active',
        kycStatus: 'approved',
        personalSalesCount: 0,
        personalSalesThisMonth: 0,
        teamSize: 0,
        joiningDate: new Date(),
      });
      console.log('✅ Admin user created with hashed password successfully:', user.mobile);
    }

    // 2. Revert the primary system admin CB-ADMIN-0001 email back to admin@curebharat.in
    const primaryAdmin = await User.findOne({ mobile: '9000000000' });
    if (primaryAdmin) {
      primaryAdmin.name = 'Sanskar Admin';
      primaryAdmin.email = 'admin@curebharat.in';
      await primaryAdmin.save();
      console.log('✅ Primary system admin CB-ADMIN-0001 email restored to admin@curebharat.in');
    }

    // Ensure wallet exists
    const wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      await Wallet.create({ user: user._id });
      console.log('✅ Wallet created for admin user');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding user:', error);
  }
}

run();
