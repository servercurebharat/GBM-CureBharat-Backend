import { connectDB } from './db';
import Wallet from '../models/Wallet';
import { calculateTDS } from './tdsCalculator';

/**
 * Monthly payout cycle — runs on the 5th of every month (T+5).
 *
 * Steps per wallet:
 * 1. Calculate TDS (5% if provisional > ₹10,000)
 * 2. Calculate GST on commission (18%)
 * 3. Deduct TDS and GST
 * 4. Move net amount: provisionalBalance → finalBalance
 * 5. Add ledger entry for TDS deduction
 * 6. Reset provisionalBalance to 0
 *
 * Called by: app/api/cron/payout-cycle/route.ts (admin trigger or Vercel cron)
 *
 * @param cycleMonth - Format: YYYY-MM (e.g. "2025-06")
 */
export async function runPayoutCycle(cycleMonth: string): Promise<{
  processedWallets: number;
  totalNetPaid: number;
  totalTdsDeducted: number;
}> {
  await connectDB();

  let processedWallets = 0;
  let totalNetPaid = 0;
  let totalTdsDeducted = 0;

  const BATCH_SIZE = 100;
  let skip = 0;

  while (true) {
    const wallets = await Wallet.find({ provisionalBalance: { $gt: 0 } })
      .skip(skip)
      .limit(BATCH_SIZE);

    if (wallets.length === 0) break;

    for (const wallet of wallets) {
      const { netPayable, tdsAmount, gstAmount } = calculateTDS(
        wallet.provisionalBalance
      );

      // Add TDS deduction ledger entry if applicable
      if (tdsAmount > 0 || gstAmount > 0) {
        wallet.ledger.push({
          type: 'tds_deduction',
          amount: -(tdsAmount + gstAmount),
          description: `TDS ₹${tdsAmount} + GST on commission ₹${gstAmount} for cycle ${cycleMonth}`,
          sourceUserId: undefined,
          status: 'final',
          cycleMonth,
          createdAt: new Date(),
        });
      }

      // Move net amount to final balance
      wallet.finalBalance += netPayable;
      wallet.totalEarned += netPayable;
      wallet.provisionalBalance = 0;

      await wallet.save();

      totalNetPaid += netPayable;
      totalTdsDeducted += tdsAmount;
      processedWallets += 1;
    }

    skip += BATCH_SIZE;
  }

  console.log(
    `✅ Payout cycle ${cycleMonth} complete. ` +
    `Wallets: ${processedWallets}, Net paid: ₹${totalNetPaid}, TDS: ₹${totalTdsDeducted}`
  );

  return { processedWallets, totalNetPaid, totalTdsDeducted };
}
