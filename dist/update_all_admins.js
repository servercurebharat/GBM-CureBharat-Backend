"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("./models/User"));
dotenv_1.default.config();
async function run() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri)
            throw new Error('MONGODB_URI not found in env');
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        // Update all users with role 'admin'
        const result = await User_1.default.updateMany({ role: 'admin' }, { $set: { email: 'harshalsynture@gmail.com' } });
        console.log(`✅ Updated ${result.modifiedCount} admin users in the database.`);
        const admins = await User_1.default.find({ role: 'admin' }).select('name email mobile memberId');
        console.log('Current Admin Status in DB:', admins);
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
    catch (error) {
        console.error('Error updating admins:', error);
    }
}
run();
