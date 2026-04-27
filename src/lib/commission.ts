import Sale from '../models/Sale';
import User, { IUser } from '../models/User';
import Wallet from '../models/Wallet';
import { checkAndPromote } from './rankEngine';
import { Types } from 'mongoose';

/**
 * SEQUENTIAL waterfall commission processor.
 * Never run in parallel — each level depends on previous.
 * 
 * Chain: HCC (40%) → HCM (40% of HCC) → HBA (40% of HCM) → SH (2% of sale)
 */
export async function processCommission(saleId: string): Promise<void> {
  console.log(`[Commission] Processing sale: ${saleId}`);

  const sale = await Sale.findById(saleId).populate('plan');
  if (!sale) {
    console.error(`[Commission] Sale ${saleId} not found`);
    return;
  }

  if (sale.commissionProcessed) {
    console.log(`[Commission] Sale ${saleId} already processed. Skipping.`);
    return;
  }

  const plan: any = sale.plan;
  if (!plan || !plan.isCommissionable) {
    console.log(`[Commission] Plan for sale ${saleId} is not commissionable. Marking as processed.`);
    sale.commissionProcessed = true;
    await sale.save();
    return;
  }

  // Use businessVolume as the base for commission calculation (₹ excluding GST)
  const baseAmount = sale.businessVolume;
  const cycleMonth = sale.cycleMonth;

  // 1. HCC DIRECT INCOME (40% of baseAmount)
  const hcc = await User.findById(sale.hccId);
  if (!hcc) {
    console.error(`[Commission] Seller ${sale.seller} not found for sale ${saleId}`);
    return;
  }

  const hccIncome = Math.round(baseAmount * 0.40);
  await addToWallet({
    userId: hcc._id as Types.ObjectId,
    amount: hccIncome,
    type: 'direct',
    description: `Direct sale commission - Policy ${sale.policyId}`,
    sourceUserId: hcc._id as Types.ObjectId,
    status: 'provisional',
    cycleMonth
  });

  hcc.personalSalesCount += 1;
  hcc.personalSalesThisMonth += 1;
  hcc.lastSaleDate = new Date();
  await hcc.save();

  // 2. HCM OVERRIDE (40% of HCC Direct Income)
  let hcm: IUser | null = null;
  if (hcc.referrerId) {
    hcm = await findNextActiveUpline(hcc.referrerId as Types.ObjectId, 'HCM');
  }

  let hcmIncome = 0;
  if (hcm) {
    hcmIncome = Math.round(hccIncome * 0.40);
    await addToWallet({
      userId: hcm._id as Types.ObjectId,
      amount: hcmIncome,
      type: 'override',
      description: `Override from HCC ${hcc.memberId} - Policy ${sale.policyId}`,
      sourceUserId: hcc._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth
    });
  } else {
    console.log(`[Commission] No active HCM found in upline for HCC ${hcc.memberId}`);
  }

  // 3. HBA OVERRIDE (40% of HCM Override Income)
  let hba: IUser | null = null;
  if (hcm && hcm.referrerId) {
    hba = await findNextActiveUpline(hcm.referrerId as Types.ObjectId, 'HBA');
  } else if (hcc.referrerId) {
    // If no HCM was found, look for HBA starting from HCC's referrer
    hba = await findNextActiveUpline(hcc.referrerId as Types.ObjectId, 'HBA');
  }

  let hbaIncome = 0;
  if (hba) {
    // Note: HBA gets 40% of what the HCM WOULD have earned (hccIncome * 0.4)
    // even if the HCM was missing/inactive (Pass-up logic)
    const potentialHcmIncome = Math.round(hccIncome * 0.40);
    hbaIncome = Math.round(potentialHcmIncome * 0.40);
    
    await addToWallet({
      userId: hba._id as Types.ObjectId,
      amount: hbaIncome,
      type: 'override',
      description: `Override from ${hcm ? 'HCM ' + hcm.memberId : 'downline'} - Policy ${sale.policyId}`,
      sourceUserId: hcm ? hcm._id as Types.ObjectId : hcc._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth
    });
  } else {
    console.log(`[Commission] No active HBA found in upline`);
  }

  // 4. SH LEADERSHIP BONUS (2% of baseAmount)
  let sh: IUser | null = null;
  if (hba && hba.referrerId) {
    sh = await findNextActiveUpline(hba.referrerId as Types.ObjectId, 'SH');
  } else if (hcc.referrerId) {
    sh = await findNextActiveUpline(hcc.referrerId as Types.ObjectId, 'SH');
  }

  if (sh) {
    const shIncome = Math.round(baseAmount * 0.02);
    await addToWallet({
      userId: sh._id as Types.ObjectId,
      amount: shIncome,
      type: 'leadership',
      description: `2% leadership bonus - Policy ${sale.policyId}`,
      sourceUserId: hcc._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth
    });
  } else {
    console.log(`[Commission] No active SH found in upline`);
  }

  // FINALIZE
  sale.commissionProcessed = true;
  await sale.save();

  // TRIGGER RANK CHECK
  await checkAndPromote(hcc._id.toString()).catch(err => console.error(`[RankEngine] Error:`, err));

  console.log(`[Commission] Completed for sale ${sale.policyId}`);
}

// Helper: addToWallet
async function addToWallet(entry: {
  userId: Types.ObjectId,
  amount: number,
  type: 'direct' | 'override' | 'leadership' | 'withdrawal' | 'tds_deduction',
  description: string,
  sourceUserId: Types.ObjectId,
  status: 'provisional' | 'final',
  cycleMonth: string
}): Promise<void> {
  let wallet = await Wallet.findOne({ user: entry.userId });
  if (!wallet) {
    wallet = new Wallet({ user: entry.userId });
  }

  wallet.ledger.push({
    amount: entry.amount,
    type: entry.type,
    description: entry.description,
    cycleMonth: entry.cycleMonth,
    status: entry.status,
    date: new Date()
  });

  if (entry.status === 'provisional') {
    wallet.provisionalBalance += entry.amount;
  } else {
    wallet.finalBalance += entry.amount;
  }

  wallet.totalEarned += entry.amount;
  await wallet.save();
}

// Helper: findNextActiveUpline
async function findNextActiveUpline(
  userId: Types.ObjectId, 
  requiredRank: string
): Promise<IUser | null> {
  let currentId: Types.ObjectId | undefined = userId;
  let depth = 0;

  while (currentId && depth < 10) {
    const user = await User.findById(currentId);
    if (!user) break;

    // Rank weight check: requiredRank or HIGHER qualifies
    const rankOrder = ['HCC', 'HCM', 'HBA', 'SH', 'ADMIN'];
    const userRankIndex = rankOrder.indexOf(user.rank);
    const requiredRankIndex = rankOrder.indexOf(requiredRank);

    if (userRankIndex >= requiredRankIndex && user.status === 'active') {
      return user;
    }

    currentId = user.referrerId as Types.ObjectId | undefined;
    depth++;
  }

  return null;
}

export function getCurrentCycleMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
