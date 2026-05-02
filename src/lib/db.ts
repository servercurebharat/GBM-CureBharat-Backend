import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing in .env');
}

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  try {
    console.log(`[DB] Connecting to MongoDB...`);
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is empty or undefined');
    }
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: true, // Re-enable buffering but we will handle the wait
    });
    
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error; // Throw so the middleware can catch it
  }
};
