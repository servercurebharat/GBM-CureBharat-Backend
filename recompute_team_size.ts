import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  name: String,
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teamSize: Number,
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const users = await User.find({}).lean();
  
  // function to recursively count descendants
  const countDescendants = (parentId: any): number => {
    const children = users.filter((u: any) => String(u.referrerId) === String(parentId));
    let count = children.length;
    for (const child of children) {
      count += countDescendants(child._id);
    }
    return count;
  };

  for (const user of users) {
    const size = countDescendants(user._id);
    if (user.teamSize !== size) {
      await User.updateOne({ _id: user._id }, { $set: { teamSize: size } });
      console.log(`Updated team size for ${user.name} to ${size}`);
    }
  }

  console.log('Team size computation complete.');
  mongoose.disconnect();
}

run();
