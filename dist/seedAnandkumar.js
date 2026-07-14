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
const User_1 = __importDefault(require("./models/User"));
const Sale_1 = __importDefault(require("./models/Sale"));
const Plan_1 = __importDefault(require("./models/Plan"));
const commission_1 = require("./lib/commission");
dotenv.config({ path: path_1.default.join(__dirname, '../.env') });
async function seed() {
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
        // Find HJ Finance
        // Looking up by mobile from the first seeding
        const hjFinance = await User_1.default.findOne({ mobile: '8490818234' });
        if (!hjFinance) {
            console.log('HJ Finance not found! (Mobile: 8490818234)');
            process.exit(1);
        }
        // Customer details
        const mobile = '9898161195';
        // 1. Buy the Plan (Create Sale by HJ Finance for Anandkumar kalal)
        // The plan is 4999
        const plan = await Plan_1.default.findOne({ price: 499900 });
        if (!plan) {
            console.log('4999 Plan not found!');
            process.exit(1);
        }
        const existingSale = await Sale_1.default.findOne({ customerMobile: mobile, plan: plan._id });
        if (existingSale) {
            console.log('Sale already exists. Processing commission if needed...');
            if (!existingSale.commissionProcessed) {
                await (0, commission_1.processCommission)(existingSale._id.toString());
            }
        }
        else {
            const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const totalPaise = plan.price + Math.round((plan.price * (plan.gstPercent || 18)) / 100);
            const now = new Date();
            const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            // This is a retail sale, meaning enrollmentType is 'customer'
            const sale = new Sale_1.default({
                policyId,
                sellerId: hjFinance._id, // HJ Finance is the seller
                sellerMemberId: hjFinance.memberId,
                plan: plan._id,
                customerName: 'Anandkumar kalal',
                customerMobile: mobile,
                customerEmail: 'anand_kalal@yahoo.com',
                customerState: 'Gujarat',
                enrollmentType: 'customer', // Customer ONLY
                saleAmount: totalPaise,
                businessVolume: plan.businessVolume || 0,
                cycleMonth,
                status: 'active',
                sourceType: 'public_link', // Standard for retail sales
                paymentMethod: 'cashfree',
                cashfreeOrderId: `seed_${Date.now()}`
            });
            await sale.save();
            console.log('Sale created successfully! ID:', sale._id);
            // 2. Process Commission so HJ Finance gets paid
            console.log('Processing Commission...');
            await (0, commission_1.processCommission)(sale._id.toString());
            console.log('Commission processing complete!');
        }
        console.log('✅ Done seeding Anandkumar Kalal retail sale for HJ Finance!');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
}
seed();
