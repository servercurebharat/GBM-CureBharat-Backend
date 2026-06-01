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
        description: `Direct commission from ${seller.name} (${seller.memberId}) - Policy ${sale.policyId}`,
        sourceUserId: seller._id,
        status: 'provisional',
        cycleMonth,
    });
    seller.personalSalesCount += 1;
    seller.personalSalesThisMonth += 1;
    seller.lastActiveMonth = cycleMonth;
    await seller.save();
    // ── 2. HCM OVERRIDE ─────────────────────────────────────────────────────
    // Skip HCM override if the seller IS an HCM (they already got 40% direct above)
    const hcmRate = await getCommissionRate('hcm_override_percent', 40);
    let hcm = null;
    const sellerRank = (seller.rank || '').toUpperCase();
    const isSellerHcmOrAbove = ['HCM', 'HBA', 'SH'].includes(sellerRank);
    if (!isSellerHcmOrAbove && seller.referrerId) {
        hcm = await findNextExactUpline(seller.referrerId, 'HCM');
    }
    else if (sellerRank === 'HCM' && seller.referrerId) {
        // Seller is HCM — look for HCM *above* them (breakaway scenario handled below)
        // But skip self, go straight up to find HBA-level
        console.log(`[Commission] Seller is HCM (${seller.memberId}) — skipping HCM self-override, looking for HBA upline`);
    }
    let hcmIncome = 0;
    if (hcm) {
        sale.hcmId = hcm._id;
        // Check if this is an HCM recruiting another HCM breakaway
        let isBreakaway = false;
        if (seller.rank === 'HCM' && hcm._id.toString() !== seller._id.toString()) {
            isBreakaway = true;
        }
        else {
            let curr = seller;
            while (curr && curr.referrerId) {
                if (curr.referrerId.toString() === hcm._id.toString()) {
                    if (curr.rank === 'HCM') {
                        isBreakaway = true;
                    }
                    break;
                }
                const refId = curr.referrerId;
                curr = await User_1.default.findById(refId);
            }
        }
        if (isBreakaway) {
            console.log(`[Commission] ⚖️ Breakaway Split applied! HCM ${hcm.memberId} receives 20% override immediately, 20% held.`);
            // Split the 40% override: 20% immediate, 20% held
            const splitIncome = Math.round(directIncome * 0.20);
            hcmIncome = splitIncome;
            // 1. Pay the 20% immediate
            await addToWallet({
                userId: hcm._id,
                amount: splitIncome,
                type: 'override',
                description: `HCM breakaway 20% immediate override from ${seller.name} (${seller.memberId}) - Policy ${sale.policyId}`,
                sourceUserId: seller._id,
                status: 'provisional',
                cycleMonth,
            });
            // 2. Hold the remaining 20% to be released at HBA promotion
            await addToWallet({
                userId: hcm._id,
                amount: splitIncome,
                type: 'override',
                description: `HCM breakaway 20% held override from ${seller.name} (${seller.memberId}) - Policy ${sale.policyId} (Releases at HBA Rank)`,
                sourceUserId: seller._id,
                status: 'held',
                cycleMonth,
            });
        }
        else {
            hcmIncome = Math.round(directIncome * hcmRate);
            await addToWallet({
                userId: hcm._id,
                amount: hcmIncome,
                type: 'override',
                description: `HCM override from ${seller.name} (${seller.memberId}) - Policy ${sale.policyId}`,
                sourceUserId: seller._id,
                status: 'provisional',
                cycleMonth,
            });
        }
    }
    // ── 3. HBA OVERRIDE ─────────────────────────────────────────────────────
    const hbaRate = await getCommissionRate('hba_override_percent', 40);
    let hba = null;
    // When seller is HBA or above, skip HBA override on self — go straight to SH
    const isSellerHbaOrAbove = ['HBA', 'SH'].includes(sellerRank);
    if (!isSellerHbaOrAbove) {
        const searchStartForHba = (hcm && hcm.referrerId) ? hcm.referrerId : seller.referrerId;
        if (searchStartForHba) {
            hba = await findNextExactUpline(searchStartForHba, 'HBA');
        }
    }
    else {
        // Seller is HBA or SH — their own upline for HBA override search starts from their referrer
        if (seller.referrerId && sellerRank !== 'SH') {
            hba = await findNextExactUpline(seller.referrerId, 'HBA');
        }
    }
    let hbaIncome = 0;
    if (hba) {
        sale.hbaId = hba._id;
        const potentialHcmIncome = Math.round(directIncome * hcmRate);
        hbaIncome = Math.round(potentialHcmIncome * hbaRate);
        const hbaSourceUser = hcm || seller;
        await addToWallet({
            userId: hba._id,
            amount: hbaIncome,
            type: 'override',
            description: `HBA override from ${hbaSourceUser.name} (${hbaSourceUser.memberId}) - Policy ${sale.policyId}`,
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
        const shSourceUser = hba || hcm || seller;
        await addToWallet({
            userId: sh._id,
            amount: shIncome,
            type: 'leadership',
            description: `SH leadership bonus from ${shSourceUser.name} (${shSourceUser.memberId}) - Policy ${sale.policyId}`,
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
        sourceUserId: entry.sourceUserId,
    });
    if (entry.status === 'provisional') {
        wallet.provisionalBalance += entry.amount;
        wallet.totalEarned += entry.amount;
    }
    else if (entry.status === 'final') {
        wallet.finalBalance += entry.amount;
        wallet.totalEarned += entry.amount;
    }
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
