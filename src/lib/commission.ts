import Sale from '../models/Sale';
import User, { IUser } from '../models/User';
import Wallet from '../models/Wallet';
import { checkAndPromote } from './rankEngine';
import { Types } from 'mongoose';
import Config from '../models/Config';

async function getCommissionRate(key: string, defaultValue: number): Promise<number> {
  try {
    const config = await Config.findOne({ key });
    return config ? parseFloat(config.value) / 100 : defaultValue / 100;
  } catch (err) {
    return defaultValue / 100;
  }
}

/**
 * SEQUENTIAL waterfall commission processor.
 * Chain: Seller (40% BV) → upline HCM (40% of Seller) → upline HBA (40% of HCM) → upline SH (2% BV)
 */
export async function processCommission(saleId: string): Promise<void> {
  console.log(`[Commission] Processing sale: ${saleId}`);

  const sale = await Sale.findById(saleId).populate('plan');
  if (!sale) { console.error(`[Commission] Sale ${saleId} not found`); return; }

  if (sale.commissionProcessed) {
    console.log(`[Commission] Sale ${saleId} already processed. Skipping.`);
    return;
  }

  const plan: any = sale.plan;
  if (!plan || !plan.isCommissionable) {
    sale.commissionProcessed = true;
    await sale.save();
    return;
  }

  const baseAmount = sale.businessVolume; // commission base (paise, excl GST)
  const cycleMonth = sale.cycleMonth;

  // ── 1. DIRECT INCOME (HCC) ──────────────────────────────────────────────
  const hccRate = await getCommissionRate('hcc_direct_percent', 40);
  const seller = await User.findById(sale.sellerId);
  if (!seller) { console.error(`[Commission] Seller not found for sale ${saleId}`); return; }

  const directIncome = Math.round(baseAmount * hccRate);
  await addToWallet({
    userId: seller._id as Types.ObjectId,
    amount: directIncome,
    type: 'direct',
    description: `Direct commission - Policy ${sale.policyId}`,
    sourceUserId: seller._id as Types.ObjectId,
    status: 'provisional',
    cycleMonth,
  });

  seller.personalSalesCount += 1;
  seller.personalSalesThisMonth += 1;
  seller.lastActiveMonth = cycleMonth;
  await seller.save();

  // ── 2. HCM OVERRIDE ─────────────────────────────────────────────────────
  const hcmRate = await getCommissionRate('hcm_override_percent', 40);
  let hcm: IUser | null = null;
  if (seller.referrerId) {
    hcm = await findNextExactUpline(seller.referrerId as Types.ObjectId, 'HCM');
  }

  let hcmIncome = 0;
  if (hcm) {
    sale.hcmId = hcm._id as Types.ObjectId;
    hcmIncome = Math.round(directIncome * hcmRate);
    await addToWallet({
      userId: hcm._id as Types.ObjectId,
      amount: hcmIncome,
      type: 'override',
      description: `HCM override from ${seller.memberId} - Policy ${sale.policyId}`,
      sourceUserId: seller._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth,
    });
  }

  // ── 3. HBA OVERRIDE ─────────────────────────────────────────────────────
  const hbaRate = await getCommissionRate('hba_override_percent', 40);
  let hba: IUser | null = null;
  const searchStartForHba = (hcm && hcm.referrerId) ? hcm.referrerId : seller.referrerId;
  
  if (searchStartForHba) {
    hba = await findNextExactUpline(searchStartForHba as Types.ObjectId, 'HBA');
  }

  let hbaIncome = 0;
  if (hba) {
    sale.hbaId = hba._id as Types.ObjectId;
    const potentialHcmIncome = Math.round(directIncome * hcmRate);
    hbaIncome = Math.round(potentialHcmIncome * hbaRate);
    await addToWallet({
      userId: hba._id as Types.ObjectId,
      amount: hbaIncome,
      type: 'override',
      description: `HBA override from ${hcm ? hcm.memberId : seller.memberId} - Policy ${sale.policyId}`,
      sourceUserId: seller._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth,
    });
  }

  // ── 4. SH LEADERSHIP BONUS ──────────────────────────────────────────────
  const shRate = await getCommissionRate('sh_leadership_percent', 2);
  const searchStartForSh = hba 
    ? hba.referrerId 
    : (hcm ? hcm.referrerId : seller.referrerId);

  let sh: IUser | null = null;
  if (searchStartForSh) {
    sh = await findNextExactUpline(searchStartForSh as Types.ObjectId, 'SH');
  }

  if (sh) {
    sale.shId = sh._id as Types.ObjectId;
    const shIncome = Math.round(baseAmount * shRate);
    await addToWallet({
      userId: sh._id as Types.ObjectId,
      amount: shIncome,
      type: 'leadership',
      description: `SH leadership bonus - Policy ${sale.policyId}`,
      sourceUserId: seller._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth,
    });
  }

  // ── FINALIZE ──────────────────────────────────────────────────────────────
  sale.commissionProcessed = true;
  await sale.save();

  // Trigger rank promotion check for seller
  await checkAndPromote(seller._id.toString()).catch((err) =>
    console.error(`[RankEngine] Error:`, err)
  );

  console.log(`[Commission] ✅ Completed for ${sale.policyId} | Direct: ₹${directIncome/100} | HCM: ₹${hcmIncome/100} | HBA: ₹${hbaIncome/100}`);
}

// ── Helper: addToWallet ───────────────────────────────────────────────────────
async function addToWallet(entry: {
  userId: Types.ObjectId;
  amount: number;
  type: 'direct' | 'override' | 'leadership' | 'withdrawal' | 'tds_deduction';
  description: string;
  sourceUserId: Types.ObjectId;
  status: 'provisional' | 'final';
  cycleMonth: string;
}): Promise<void> {
  let wallet = await Wallet.findOne({ user: entry.userId });
  if (!wallet) wallet = new Wallet({ user: entry.userId });

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
  } else {
    wallet.finalBalance += entry.amount;
  }
  wallet.totalEarned += entry.amount;
  await wallet.save();
}

// ── Helper: findNextExactUpline ───────────────────────────────────────────────
// Traverses upline and finds the first user with EXACTLY the required rank.
// Fixes the bug where SH was accidentally matching HBA searches.
async function findNextExactUpline(
  userId: Types.ObjectId,
  requiredRank: string
): Promise<IUser | null> {
  let currentId: Types.ObjectId | undefined = userId;
  let depth = 0;

  console.log(`[Commission] Searching for ${requiredRank} starting from ${userId}`);

  while (currentId && depth < 20) {
    const user = await User.findById(currentId);
    if (!user) break;

    const currentRank = (user.rank || '').toUpperCase();
    const currentRole = (user.role || '').toUpperCase();

    console.log(`[Commission] Step ${depth}: User ${user.memberId} has Role: ${currentRole}, Rank: ${currentRank}`);

    if ((currentRank === requiredRank || currentRole === requiredRank) && user.status === 'active') {
      console.log(`[Commission] Found ${requiredRank}: ${user.memberId}`);
      return user;
    }

    currentId = user.referrerId as Types.ObjectId | undefined;
    depth++;
  }

  console.log(`[Commission] No ${requiredRank} found in upline`);
  return null;
}

export function getCurrentCycleMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
