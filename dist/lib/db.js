"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI || '';
if (!MONGODB_URI) {
    console.error('MONGODB_URI is missing in .env');
}
// Cache connection across serverless invocations using Mongoose's native state.
// readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
const connectDB = async () => {
    // If already connected, reuse the existing connection
    if (mongoose_1.default.connection.readyState === 1) {
        return;
    }
    // If currently connecting, wait for it to complete
    if (mongoose_1.default.connection.readyState === 2) {
        await new Promise((resolve) => {
            mongoose_1.default.connection.once('connected', resolve);
        });
        return;
    }
    try {
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI is empty or undefined');
        }
        console.log('[DB] Connecting to MongoDB...');
        await mongoose_1.default.connect(MONGODB_URI, {
            // Increased for Vercel serverless cold starts — Atlas takes time to accept
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            // Disable buffering: fail fast if not connected instead of hanging
            bufferCommands: false,
            maxPoolSize: 10,
        });
        console.log('✅ MongoDB connected successfully');
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
};
exports.connectDB = connectDB;
