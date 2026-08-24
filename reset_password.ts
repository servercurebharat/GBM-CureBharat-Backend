import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User';

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    const user = await User.findOne({ name: /HJ Finance/i });
    if (!user) {
      console.log('User HJ Finance not found!');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456789', salt);

    user.password = hashedPassword;
    await user.save();

    console.log(`Password for ${user.name} (${user.memberId}) successfully reset to 123456789.`);
    console.log(`New Hash: ${hashedPassword}`);

  } catch (err) {
    console.error('Error resetting password:', err);
  } finally {
    process.exit(0);
  }
});
