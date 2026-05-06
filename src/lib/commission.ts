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

  // 1. DIRECT INCOME (40% of baseAmount)
  // This goes to the actual seller, regardless of their role (HCC/HCM/HBA/SH)
  const seller = await User.findById(sale.hccId);
  if (!seller) {
    console.error(`[Commission] Seller not found for sale ${saleId}`);
    return;
  }

  const directIncome = Math.round(baseAmount * 0.40);
  await addToWallet({
    userId: seller._id as Types.ObjectId,
    amount: directIncome,
    type: 'direct',
    description: `Direct sale commission - Policy ${sale.policyId}`,
    sourceUserId: seller._id as Types.ObjectId,
    status: 'provisional',
    cycleMonth
  });

  seller.personalSalesCount += 1;
  seller.personalSalesThisMonth += 1;
  seller.lastActiveMonth = cycleMonth;
  await seller.save();

  // 2. HCM OVERRIDE (40% of Direct Income)
  // Only calculate if the seller is an HCC
  let hccDirectIncome = directIncome;
  let hcm: IUser | null = null;
  
  if (seller.role === 'hcc' && seller.referrerId) {
    hcm = await findNextActiveUpline(seller.referrerId as Types.ObjectId, 'HCM');
  }

  let hcmIncome = 0;
  if (hcm) {
    sale.hcmId = hcm._id as Types.ObjectId;
    hcmIncome = Math.round(hccDirectIncome * 0.40);
    await addToWallet({
      userId: hcm._id as Types.ObjectId,
      amount: hcmIncome,
      type: 'override',
      description: `Override from HCC ${seller.memberId} - Policy ${sale.policyId}`,
      sourceUserId: seller._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth
    });
  }
 else {
    console.log(`[Commission] No active HCM found in upline for HCC ${seller.memberId}`);
  }

  // 3. HBA OVERRIDE (40% of HCM Potential Income)
  let hba: IUser | null = null;
  const potentialHcmIncome = Math.round(directIncome * 0.40);

  if (seller.role === 'hba') {
    // If seller is HBA, no HCM override exists, and they got the 40% direct.
    // SH will get the 2% later.
  } else {
    // Look for HBA starting from the best possible point
    const searchStartId = hcm ? hcm.referrerId : seller.referrerId;
    if (searchStartId) {
      hba = await findNextActiveUpline(searchStartId as Types.ObjectId, 'HBA');
    }
  }

  let hbaIncome = 0;
  if (hba) {
    sale.hbaId = hba._id as Types.ObjectId;
    // HBA always gets 40% of a potential HCM's income (Pass-up logic)
    hbaIncome = Math.round(potentialHcmIncome * 0.40);
    
    await addToWallet({
      userId: hba._id as Types.ObjectId,
      amount: hbaIncome,
      type: 'override',
      description: `Override from ${hcm ? 'HCM ' + hcm.memberId : 'downline'} - Policy ${sale.policyId}`,
      sourceUserId: seller._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth
    });
  }

  // 4. SH LEADERSHIP BONUS (2% of baseAmount)
  let sh: IUser | null = null;
  const searchStartIdForSh = hba ? hba.referrerId : (hcm ? hcm.referrerId : seller.referrerId);
  
  if (searchStartIdForSh) {
    sh = await findNextActiveUpline(searchStartIdForSh as Types.ObjectId, 'SH');
  }

  if (sh) {
    sale.shId = sh._id as Types.ObjectId;
    const shIncome = Math.round(baseAmount * 0.02);
    await addToWallet({
      userId: sh._id as Types.ObjectId,
      amount: shIncome,
      type: 'leadership',
      description: `2% leadership bonus - Policy ${sale.policyId}`,
      sourceUserId: seller._id as Types.ObjectId,
      status: 'provisional',
      cycleMonth
    });
  }

  // FINALIZE
  sale.commissionProcessed = true;
  await sale.save();

  // TRIGGER RANK CHECK
  await checkAndPromote(seller._id.toString()).catch(err => console.error(`[RankEngine] Error:`, err));

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
