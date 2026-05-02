import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing in .env');
}

export const connectDB = async () => {
  try {
    console.log(`[DB] Attempting to connect to MongoDB... (URI length: ${MONGODB_URI.length})`);
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is empty or undefined');
    }
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false, // Stop buffering so we get real errors immediately
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't exit process in Vercel, just log it
  }
};
