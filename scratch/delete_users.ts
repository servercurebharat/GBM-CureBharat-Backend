import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not found");
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri as string);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }
  const usersCollection = db.collection('users');

  const users = await usersCollection.find({
    memberId: { $in: ['CB-HCC-1008', 'CB-HCC-1009'] }
  }).toArray();

  console.log('Found users:', users.map((u: any) => `${u.memberId} - ${u.name}`));

  if (users.length > 0) {
    const res = await usersCollection.deleteMany({
      memberId: { $in: ['CB-HCC-1008', 'CB-HCC-1009'] }
    });
    console.log(`Deleted ${res.deletedCount} users.`);
  } else {
    console.log('No users found to delete.');
  }

  process.exit(0);
}

run().catch(console.error);
