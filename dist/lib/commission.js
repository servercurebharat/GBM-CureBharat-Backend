"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCommission = processCommission;
exports.getCurrentCycleMonth = getCurrentCycleMonth;
const Sale_1 = __importDefault(require("../models/Sale"));
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const rankEngine_1 = require("./rankEngine");
const Config_1 = __importDefault(require("../models/Config"));
async function getCommissionRate(key, defaultValue) {
    try {
        const config = await Config_1.default.findOne({ key });
        return config ? parseFloat(config.value) / 100 : defaultValue / 100;
    }
    catch (err) {
        return defaultValue / 100;
    }
}
/**
 * SEQUENTIAL waterfall commission processor.
 * Chain: Seller (40% BV) → upline HCM (40% of Seller) → upline HBA (40% of HCM) → upline SH (2% BV)
 */
async function processCommission(saleId) {
    console.log(`[Commission] Processing sale: ${saleId}`);
    const sale = await Sale_1.default.findById(saleId).populate('plan');
    if (!sale) {
        console.error(`[Commission] Sale ${saleId} not found`);
        return;
    }
    if (sale.commissionProcessed) {
        console.log(`[Commission] Sale ${saleId} already processed. Skipping.`);
        return;
    }
    const plan = sale.plan;
    if (!plan || !plan.isCommissionable) {
        sale.commissionProcessed = true;
        await sale.save();
        return;
    }
    const baseAmount = sale.businessVolume; // commission base (paise, excl GST)
    const cycleMonth = sale.cycleMonth;
    // ── 1. DIRECT INCOME (HCC) ──────────────────────────────────────────────
    const hccRate = await getCommissionRate('hcc_direct_percent', 40);
    const seller = await User_1.default.findById(sale.sellerId);
    if (!seller) {
        console.error(`[Commission] Seller not found for sale ${saleId}`);
        return;
    }
    const directIncome = Math.round(baseAmount * hccRate);
    await addToWallet({
        userId: seller._id,
        amount: directIncome,
        type: 'direct',
        description: `Direct commission - Policy ${sale.policyId}`,
        sourceUserId: seller._id,
        status: 'provisional',
        cycleMonth,
    });
    seller.personalSalesCount += 1;
    seller.personalSalesThisMonth += 1;
    seller.lastActiveMonth = cycleMonth;
    await seller.save();
    // ── 2. HCM OVERRIDE ─────────────────────────────────────────────────────
    const hcmRate = await getCommissionRate('hcm_override_percent', 40);
    let hcm = null;
    if (seller.referrerId) {
        hcm = await findNextExactUpline(seller.referrerId, 'HCM');
    }
    let hcmIncome = 0;
    if (hcm) {
        sale.hcmId = hcm._id;
        hcmIncome = Math.round(directIncome * hcmRate);
        await addToWallet({
            userId: hcm._id,
            amount: hcmIncome,
            type: 'override',
            description: `HCM override from ${seller.memberId} - Policy ${sale.policyId}`,
            sourceUserId: seller._id,
            status: 'provisional',
            cycleMonth,
        });
    }
    // ── 3. HBA OVERRIDE ─────────────────────────────────────────────────────
    const hbaRate = await getCommissionRate('hba_override_percent', 40);
    let hba = null;
    const searchStartForHba = (hcm && hcm.referrerId) ? hcm.referrerId : seller.referrerId;
    if (searchStartForHba) {
        hba = await findNextExactUpline(searchStartForHba, 'HBA');
    }
    let hbaIncome = 0;
    if (hba) {
        sale.hbaId = hba._id;
        const potentialHcmIncome = Math.round(directIncome * hcmRate);
        hbaIncome = Math.round(potentialHcmIncome * hbaRate);
        await addToWallet({
            userId: hba._id,
            amount: hbaIncome,
            type: 'override',
            description: `HBA override from ${hcm ? hcm.memberId : seller.memberId} - Policy ${sale.policyId}`,
            sourceUserId: seller._id,
            status: 'provisional',
            cycleMonth,
        });
    }
    // ── 4. SH LEADERSHIP BONUS ──────────────────────────────────────────────
    const shRate = await getCommissionRate('sh_leadership_percent', 2);
    const searchStartForSh = hba
        ? hba.referrerId
        : (hcm ? hcm.referrerId : seller.referrerId);
    let sh = null;
    if (searchStartForSh) {
        sh = await findNextExactUpline(searchStartForSh, 'SH');
    }
    if (sh) {
        sale.shId = sh._id;
        const shIncome = Math.round(baseAmount * shRate);
        await addToWallet({
            userId: sh._id,
            amount: shIncome,
            type: 'leadership',
            description: `SH leadership bonus - Policy ${sale.policyId}`,
            sourceUserId: seller._id,
            status: 'provisional',
            cycleMonth,
        });
    }
    // ── FINALIZE ──────────────────────────────────────────────────────────────
    // Set role IDs for visibility based on seller role
    if (seller.role === 'hcc')
        sale.hccId = seller._id;
    else if (seller.role === 'hcm')
        sale.hcmId = seller._id;
    else if (seller.role === 'hba')
        sale.hbaId = seller._id;
    else if (seller.role === 'sh')
        sale.shId = seller._id;
    if (hcm)
        sale.hcmId = hcm._id;
    if (hba)
        sale.hbaId = hba._id;
    if (sh)
        sale.shId = sh._id;
    sale.commissionProcessed = true;
    await sale.save();
    // Trigger rank promotion check for seller
    await (0, rankEngine_1.checkAndPromote)(seller._id.toString()).catch((err) => console.error(`[RankEngine] Error:`, err));
    console.log(`[Commission] ✅ Completed for ${sale.policyId} | Direct: ₹${directIncome / 100} | HCM: ₹${hcmIncome / 100} | HBA: ₹${hbaIncome / 100}`);
}
// ── Helper: addToWallet ───────────────────────────────────────────────────────
async function addToWallet(entry) {
    let wallet = await Wallet_1.default.findOne({ user: entry.userId });
    if (!wallet)
        wallet = new Wallet_1.default({ user: entry.userId });
    wallet.ledger.push({
        amount: entry.amount,
        type: entry.type,
        description: entry.description,
        cycleMonth: entry.cycleMonth,
        status: entry.status,
        date: new Date(),
    });
    if (entry.status === 'provisional') {
        wallet.provisionalBalance += entry.amount;
    }
    else {
        wallet.finalBalance += entry.amount;
    }
    wallet.totalEarned += entry.amount;
    await wallet.save();
}
// ── Helper: findNextExactUpline ───────────────────────────────────────────────
// Traverses upline and finds the first user with EXACTLY the required rank.
// Fixes the bug where SH was accidentally matching HBA searches.
async function findNextExactUpline(userId, requiredRank) {
    let currentId = userId;
    let depth = 0;
    console.log(`[Commission] Searching for ${requiredRank} starting from ${userId}`);
    while (currentId && depth < 20) {
        const user = await User_1.default.findById(currentId);
        if (!user)
            break;
        const currentRank = (user.rank || '').toUpperCase();
        const currentRole = (user.role || '').toUpperCase();
        console.log(`[Commission] Step ${depth}: User ${user.memberId} has Role: ${currentRole}, Rank: ${currentRank}`);
        if ((currentRank === requiredRank || currentRole === requiredRank) && user.status === 'active') {
            console.log(`[Commission] Found ${requiredRank}: ${user.memberId}`);
            return user;
        }
        currentId = user.referrerId;
        depth++;
    }
    console.log(`[Commission] No ${requiredRank} found in upline`);
    return null;
}
function getCurrentCycleMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
