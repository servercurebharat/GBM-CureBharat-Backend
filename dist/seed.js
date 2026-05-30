"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("./models/User"));
const Plan_1 = __importDefault(require("./models/Plan"));
const Wallet_1 = __importDefault(require("./models/Wallet"));
const EPin_1 = __importDefault(require("./models/EPin"));
const Config_1 = __importDefault(require("./models/Config"));
dotenv_1.default.config();
async function seed() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri)
            throw new Error('MONGODB_URI not found in env');
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        await Promise.all([
            User_1.default.deleteMany({}),
            Plan_1.default.deleteMany({}),
            Wallet_1.default.deleteMany({}),
            EPin_1.default.deleteMany({}),
            Config_1.default.deleteMany({})
        ]);
        console.log('Collections cleared');
        // --- CONFIG ---
        await Config_1.default.insertMany([
            { key: 'hcc_direct_percent', value: 40, description: 'Direct income for HCC from policy BV' },
            { key: 'hcm_override_percent', value: 40, description: 'Override for HCM from HCC earnings' },
            { key: 'hba_override_percent', value: 40, description: 'Override for HBA from HCM earnings' },
            { key: 'sh_leadership_percent', value: 2, description: 'Leadership bonus for SH from state BV' },
            { key: 'min_sales_active', value: 1, description: 'Min sales per month to remain active' },
        ]);
        // --- PLANS ---
        await Plan_1.default.insertMany([
            { name: 'Basic Wellness', price: 99900, businessVolume: 0, isCommissionable: false, gstPercent: 18, isActive: true },
            { name: 'Wellness Plus', price: 149900, businessVolume: 0, isCommissionable: false, gstPercent: 18, isActive: true },
            { name: 'Super Suraksha', price: 199900, businessVolume: 199900, isCommissionable: true, gstPercent: 18, isActive: true },
            { name: 'Family Suraksha', price: 299900, businessVolume: 299900, isCommissionable: true, gstPercent: 18, isActive: true },
            { name: 'Premium Suraksha', price: 499900, businessVolume: 499900, isCommissionable: true, gstPercent: 18, isActive: true },
        ]);
        // --- ADMIN ---
        const admin = await User_1.default.create({
            name: 'Sanskar Admin', mobile: '9000000000', email: 'admin@curebharat.in',
            password: await bcryptjs_1.default.hash('Admin@123', 12), role: 'admin', rank: 'ADMIN',
            memberId: 'CB-ADMIN-0001', state: 'Maharashtra', status: 'active', kycStatus: 'approved',
            personalSalesCount: 0, personalSalesThisMonth: 0, teamSize: 0, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: admin._id });
        // --- STATE HEAD: Rajesh Patel ---
        const sh = await User_1.default.create({
            name: 'Rajesh Patel', mobile: '9100000001', email: 'rajesh.sh@curebharat.in',
            password: await bcryptjs_1.default.hash('SH@123456', 12), role: 'sh', rank: 'SH',
            memberId: 'CB-SH-0001', referrerId: admin._id, state: 'Maharashtra', status: 'active',
            kycStatus: 'approved', gender: 'male', dob: new Date('1985-06-15'),
            address: { street: '123 Business Hub, MG Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India' },
            bankDetails: { accountHolderName: 'Rajesh Patel', accountNumber: '1234567890', bankName: 'HDFC Bank', ifscCode: 'HDFC0001234', branchName: 'Fort Branch' },
            personalSalesCount: 0, personalSalesThisMonth: 0, teamSize: 0, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: sh._id });
        console.log('✅ SH created: Rajesh Patel (9100000001 | SH@123456)');
        // ============================================================
        // HBA 1: Sanjay Mehta (directly under Rajesh Patel / SH)
        // ============================================================
        const hba1 = await User_1.default.create({
            name: 'Sanjay Mehta', mobile: '9200000001', email: 'sanjay.hba@curebharat.in',
            password: await bcryptjs_1.default.hash('HBA@123456', 12), role: 'hba', rank: 'HBA',
            memberId: 'CB-HBA-0001', referrerId: sh._id, state: 'Maharashtra', status: 'active',
            kycStatus: 'approved', personalSalesCount: 18, personalSalesThisMonth: 4, teamSize: 12, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: hba1._id });
        // HBA 2: Meena Joshi
        const hba2 = await User_1.default.create({
            name: 'Meena Joshi', mobile: '9200000002', email: 'meena.hba@curebharat.in',
            password: await bcryptjs_1.default.hash('HBA@123456', 12), role: 'hba', rank: 'HBA',
            memberId: 'CB-HBA-0002', referrerId: sh._id, state: 'Maharashtra', status: 'active',
            kycStatus: 'approved', personalSalesCount: 12, personalSalesThisMonth: 2, teamSize: 8, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: hba2._id });
        // HBA 3: Arvind Kumar
        const hba3 = await User_1.default.create({
            name: 'Arvind Kumar', mobile: '9200000003', email: 'arvind.hba@curebharat.in',
            password: await bcryptjs_1.default.hash('HBA@123456', 12), role: 'hba', rank: 'HBA',
            memberId: 'CB-HBA-0003', referrerId: sh._id, state: 'Maharashtra', status: 'active',
            kycStatus: 'pending', personalSalesCount: 9, personalSalesThisMonth: 1, teamSize: 5, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: hba3._id });
        console.log('✅ 3 HBAs created under Rajesh Patel');
        // ============================================================
        // HCMs under HBA 1 (Sanjay Mehta)
        // ============================================================
        const hcmPwd = await bcryptjs_1.default.hash('HCM@123456', 12);
        const hcm1 = await User_1.default.create({
            name: 'Priya Desai', mobile: '9300000001', email: 'priya.hcm@curebharat.in',
            password: hcmPwd, role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-0001',
            referrerId: hba1._id, state: 'Maharashtra', status: 'active', kycStatus: 'approved',
            personalSalesCount: 14, personalSalesThisMonth: 3, teamSize: 5, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: hcm1._id });
        const hcm2 = await User_1.default.create({
            name: 'Vikram Shah', mobile: '9300000002', email: 'vikram.hcm@curebharat.in',
            password: hcmPwd, role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-0002',
            referrerId: hba1._id, state: 'Maharashtra', status: 'active', kycStatus: 'approved',
            personalSalesCount: 11, personalSalesThisMonth: 2, teamSize: 4, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: hcm2._id });
        // HCMs under HBA 2 (Meena Joshi)
        const hcm3 = await User_1.default.create({
            name: 'Sunita Rao', mobile: '9300000003', email: 'sunita.hcm@curebharat.in',
            password: hcmPwd, role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-0003',
            referrerId: hba2._id, state: 'Maharashtra', status: 'active', kycStatus: 'approved',
            personalSalesCount: 8, personalSalesThisMonth: 2, teamSize: 3, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: hcm3._id });
        const hcm4 = await User_1.default.create({
            name: 'Deepak Nair', mobile: '9300000004', email: 'deepak.hcm@curebharat.in',
            password: hcmPwd, role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-0004',
            referrerId: hba2._id, state: 'Maharashtra', status: 'inactive', kycStatus: 'approved',
            personalSalesCount: 5, personalSalesThisMonth: 0, teamSize: 2, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: hcm4._id });
        // 1 HCM under HBA 3 (Arvind Kumar)
        const hcm5 = await User_1.default.create({
            name: 'Kavita Singh', mobile: '9300000005', email: 'kavita.hcm@curebharat.in',
            password: hcmPwd, role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-0005',
            referrerId: hba3._id, state: 'Maharashtra', status: 'active', kycStatus: 'pending',
            personalSalesCount: 6, personalSalesThisMonth: 1, teamSize: 2, joiningDate: new Date(),
        });
        await Wallet_1.default.create({ user: hcm5._id });
        console.log('✅ 5 HCMs created');
        // ============================================================
        // HCCs under HCM 1 (Priya Desai)
        // ============================================================
        const hccPwd = await bcryptjs_1.default.hash('HCC@123456', 12);
        const hccData = [
            { name: 'Amit Kumar', mobile: '9400000001', email: 'amit.hcc@curebharat.in', memberId: 'CB-HCC-0001', referrerId: hcm1._id, status: 'active', kycStatus: 'approved', sales: 6 },
            { name: 'Neha Sharma', mobile: '9400000002', email: 'neha.hcc@curebharat.in', memberId: 'CB-HCC-0002', referrerId: hcm1._id, status: 'active', kycStatus: 'pending', sales: 4 },
            { name: 'Kiran Patil', mobile: '9400000003', email: 'kiran.hcc@curebharat.in', memberId: 'CB-HCC-0003', referrerId: hcm1._id, status: 'active', kycStatus: 'approved', sales: 5 },
            // HCCs under HCM 2 (Vikram Shah)
            { name: 'Ravi Joshi', mobile: '9400000004', email: 'ravi.hcc@curebharat.in', memberId: 'CB-HCC-0004', referrerId: hcm2._id, status: 'inactive', kycStatus: 'approved', sales: 1 },
            { name: 'Pooja Kulkarni', mobile: '9400000005', email: 'pooja.hcc@curebharat.in', memberId: 'CB-HCC-0005', referrerId: hcm2._id, status: 'active', kycStatus: 'approved', sales: 3 },
            { name: 'Suresh Mehta', mobile: '9400000006', email: 'suresh.hcc@curebharat.in', memberId: 'CB-HCC-0006', referrerId: hcm2._id, status: 'active', kycStatus: 'approved', sales: 7 },
            { name: 'Anita Das', mobile: '9400000007', email: 'anita.hcc@curebharat.in', memberId: 'CB-HCC-0007', referrerId: hcm2._id, status: 'active', kycStatus: 'pending', sales: 2 },
            // HCCs under HCM 3 (Sunita Rao)
            { name: 'Rajiv Gupta', mobile: '9400000008', email: 'rajiv.hcc@curebharat.in', memberId: 'CB-HCC-0008', referrerId: hcm3._id, status: 'active', kycStatus: 'approved', sales: 5 },
            { name: 'Nisha Verma', mobile: '9400000009', email: 'nisha.hcc@curebharat.in', memberId: 'CB-HCC-0009', referrerId: hcm3._id, status: 'active', kycStatus: 'approved', sales: 4 },
            // HCCs under HCM 4 (Deepak Nair)
            { name: 'Mohan Tiwari', mobile: '9400000010', email: 'mohan.hcc@curebharat.in', memberId: 'CB-HCC-0010', referrerId: hcm4._id, status: 'active', kycStatus: 'approved', sales: 2 },
            { name: 'Lata Iyer', mobile: '9400000011', email: 'lata.hcc@curebharat.in', memberId: 'CB-HCC-0011', referrerId: hcm4._id, status: 'inactive', kycStatus: 'pending', sales: 0 },
            // HCCs under HCM 5 (Kavita Singh)
            { name: 'Sohail Khan', mobile: '9400000012', email: 'sohail.hcc@curebharat.in', memberId: 'CB-HCC-0012', referrerId: hcm5._id, status: 'active', kycStatus: 'approved', sales: 3 },
            { name: 'Rekha Pillai', mobile: '9400000013', email: 'rekha.hcc@curebharat.in', memberId: 'CB-HCC-0013', referrerId: hcm5._id, status: 'active', kycStatus: 'pending', sales: 2 },
        ];
        for (const h of hccData) {
            const u = await User_1.default.create({
                name: h.name, mobile: h.mobile, email: h.email,
                password: hccPwd, role: 'hcc', rank: 'HCC', memberId: h.memberId,
                referrerId: h.referrerId, state: 'Maharashtra', status: h.status, kycStatus: h.kycStatus,
                personalSalesCount: h.sales, personalSalesThisMonth: Math.floor(h.sales / 2),
                teamSize: 0, joiningDate: new Date(),
            });
            await Wallet_1.default.create({ user: u._id });
        }
        console.log(`✅ ${hccData.length} HCCs created`);
        // --- SUMMARY ---
        console.log('\n✅ SEED COMPLETE');
        console.log('================================');
        console.log('HIERARCHY: Rajesh Patel (SH)');
        console.log('  ├── Sanjay Mehta (HBA-0001)');
        console.log('  │   ├── Priya Desai (HCM-0001) → Amit, Neha, Kiran (HCCs)');
        console.log('  │   └── Vikram Shah (HCM-0002) → Ravi, Pooja, Suresh, Anita (HCCs)');
        console.log('  ├── Meena Joshi (HBA-0002)');
        console.log('  │   ├── Sunita Rao (HCM-0003) → Rajiv, Nisha (HCCs)');
        console.log('  │   └── Deepak Nair (HCM-0004) → Mohan, Lata (HCCs)');
        console.log('  └── Arvind Kumar (HBA-0003)');
        console.log('      └── Kavita Singh (HCM-0005) → Sohail, Rekha (HCCs)');
        console.log('================================');
        console.log('LOGIN CREDENTIALS:');
        console.log('Admin  → 9000000000 | Admin@123');
        console.log('SH     → 9100000001 | SH@123456');
        console.log('HBA    → 9200000001 | HBA@123456');
        console.log('HCM    → 9300000001 | HCM@123456');
        console.log('HCC    → 9400000001 | HCC@123456');
        console.log('================================');
    }
    catch (error) {
        console.error('Seed Error:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
}
seed();
