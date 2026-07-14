"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Adjust path to models based on execution from backend root
const User_1 = __importDefault(require("./models/User"));
const Wallet_1 = __importDefault(require("./models/Wallet"));
const Sale_1 = __importDefault(require("./models/Sale"));
const Plan_1 = __importDefault(require("./models/Plan"));
dotenv.config({ path: path_1.default.join(__dirname, '../.env') });
async function seedHJ() {
    try {
        let mongoUri = process.env.MONGODB_URI;
        if (!mongoUri)
            throw new Error('MONGODB_URI is not defined in .env');
        if (mongoUri.includes('mongodb.net/?') || mongoUri.includes('mongodb.net:27017/?')) {
            mongoUri = mongoUri.replace('/?', '/test?');
        }
        console.log('Connecting to', mongoUri.split('@')[1] || mongoUri);
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected.');
        // 1. Check if user already exists
        const mobile = '9978944422';
        let user = await User_1.default.findOne({ mobile });
        if (user) {
            console.log('User already exists. Updating email and KYC status...');
            user.email = 'satapunit7@gmail.com';
            user.kycStatus = 'pending';
            await user.save();
        }
        else {
            // Find a member ID
            const hcmCount = await User_1.default.countDocuments({ role: 'hcm' });
            const memberId = `CB-HCM-${String(hcmCount + 1000).padStart(4, '0')}`;
            console.log(`Creating user with memberId: ${memberId}`);
            user = new User_1.default({
                name: 'Punit Sata',
                mobile,
                email: 'satapunit7@gmail.com',
                state: 'Gujarat',
                password: '123456',
                role: 'hcm',
                rank: 'HCM',
                memberId,
                status: 'active',
                kycStatus: 'pending', // Pending per request
                personalSalesCount: 1, // Bought a plan
            });
            await user.save();
            console.log('User created:', user._id);
            // Create Wallet
            const wallet = new Wallet_1.default({
                user: user._id,
                provisionalBalance: 0,
                finalBalance: 0,
                totalEarned: 0,
                totalWithdrawn: 0,
                ledger: []
            });
            await wallet.save();
            console.log('Wallet created.');
        }
        // 2. Buy the Plan (Create Sale)
        const plan = await Plan_1.default.findOne({ name: { $regex: /Super Suraksha/i } });
        if (!plan) {
            console.log('Plan not found! Here are available plans:');
            const allPlans = await Plan_1.default.find().select('name');
            console.log(allPlans.map(p => p.name));
            process.exit(1);
        }
        const existingSale = await Sale_1.default.findOne({ customerMobile: mobile, plan: plan._id });
        if (existingSale) {
            console.log('Sale already exists.');
        }
        else {
            const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const totalPaise = plan.price + Math.round((plan.price * (plan.gstPercent || 18)) / 100);
            const now = new Date();
            const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const sale = new Sale_1.default({
                policyId,
                sellerId: user._id, // self sale
                sellerMemberId: user.memberId,
                plan: plan._id,
                customerName: 'Punit Sata',
                customerMobile: mobile,
                customerEmail: 'satapunit7@gmail.com',
                customerState: 'Gujarat',
                enrollmentType: 'distributor',
                saleAmount: totalPaise,
                businessVolume: plan.businessVolume || 0,
                cycleMonth,
                status: 'active',
                sourceType: 'dashboard',
                paymentMethod: 'cashfree', // just to mock
                cashfreeOrderId: `seed_${Date.now()}`
            });
            await sale.save();
            console.log('Sale created successfully!', sale._id);
        }
        console.log('✅ Done seeding HJ Finance!');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
}
seedHJ();
