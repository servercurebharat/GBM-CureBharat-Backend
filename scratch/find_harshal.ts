import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const User = mongoose.model('User', new mongoose.Schema({ name: String, mobile: String, email: String }, { strict: false }));
    const harshals = await User.find({ name: /harshal/i });
    console.log("Harshal users:", harshals);
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}
run();
