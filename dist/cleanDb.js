"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import all models
const ActivityLog_1 = __importDefault(require("./models/ActivityLog"));
const Complaint_1 = __importDefault(require("./models/Complaint"));
const EPin_1 = __importDefault(require("./models/EPin"));
const Notification_1 = __importDefault(require("./models/Notification"));
const OTP_1 = __importDefault(require("./models/OTP"));
const Payment_1 = __importDefault(require("./models/Payment"));
const Sale_1 = __importDefault(require("./models/Sale"));
const User_1 = __importDefault(require("./models/User"));
const Wallet_1 = __importDefault(require("./models/Wallet"));
const Withdrawal_1 = __importDefault(require("./models/Withdrawal"));
dotenv_1.default.config();
const KEEP_ADMINS = ['9689509651', '8269210100'];
async function cleanDatabase() {
    try {
        let mongoUri = process.env.MONGODB_URI;
        if (!mongoUri)
            throw new Error('MONGODB_URI is not defined in .env');
        // Ensure it targets the curebharat database, not test
        if (mongoUri.includes('mongodb.net/?') || mongoUri.includes('mongodb.net:27017/?')) {
            mongoUri = mongoUri.replace('/?', '/curebharat?');
        }
        if (!mongoUri.includes('curebharat')) {
            console.log('WARNING: URI does not seem to contain curebharat DB name.');
        }
        console.log(`Connecting to database... (${mongoUri.split('@')[1] || mongoUri})`);
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB.');
        console.log('1. Deleting all Sales, Payments, and Withdrawals...');
        await Sale_1.default.deleteMany({});
        await Payment_1.default.deleteMany({});
        await Withdrawal_1.default.deleteMany({});
        console.log('2. Deleting logs, complaints, and notifications...');
        await ActivityLog_1.default.deleteMany({});
        await Complaint_1.default.deleteMany({});
        await Notification_1.default.deleteMany({});
        await EPin_1.default.deleteMany({});
        await OTP_1.default.deleteMany({});
        console.log('3. Deleting all users EXCEPT the two main admins...');
        const deleteUsersResult = await User_1.default.deleteMany({ mobile: { $nin: KEEP_ADMINS } });
        console.log(`Deleted ${deleteUsersResult.deletedCount} users.`);
        console.log('4. Resetting stats for the two main admins...');
        const resetResult = await User_1.default.updateMany({ mobile: { $in: KEEP_ADMINS } }, {
            $set: {
                personalSalesCount: 0,
                personalSalesThisMonth: 0,
                teamSalesCount: 0,
                teamSalesThisMonth: 0,
                totalTeamSize: 0,
                income: 0,
                rank: 'ADMIN', // Ensuring they stay as admins
                isActive: true
            }
        });
        console.log(`Reset stats for ${resetResult.modifiedCount} admins.`);
        console.log('5. Deleting all wallets and re-creating empty ones for the admins...');
        await Wallet_1.default.deleteMany({});
        // Find the admins to create fresh empty wallets for them
        const admins = await User_1.default.find({ mobile: { $in: KEEP_ADMINS } });
        for (const admin of admins) {
            const wallet = new Wallet_1.default({
                user: admin._id,
                provisionalBalance: 0,
                finalBalance: 0,
                totalEarned: 0,
                totalWithdrawn: 0,
                ledger: []
            });
            await wallet.save();
        }
        console.log(`Created 0-balance wallets for ${admins.length} admins.`);
        console.log('\n✅ DATABASE CLEANUP COMPLETE! Handover ready.');
        console.log('NOTE: Product Catalogs (Plans) and Configs were kept intact.');
        process.exit(0);
    }
    catch (err) {
        console.error('Error during database cleanup:', err);
        process.exit(1);
    }
}
cleanDatabase();
