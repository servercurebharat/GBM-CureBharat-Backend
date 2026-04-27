import cron from 'node-cron';
import Wallet from '../models/Wallet';
import User from '../models/User';
import { calculateTDS } from './tdsCalculator';

/**
 * Runs on 5th of every month (T+5 from cycle end)
 * Moves provisional → final balances and handles tax deductions
 */
export async function runPayoutCycle(cycleMonth: string): Promise<void> {
  console.log(`[PayoutCycle] Starting settlement for cycle: ${cycleMonth}`);
  
  try {
    // Get all wallets that have earnings in the provisional balance
    const wallets = await Wallet.find({ provisionalBalance: { $gt: 0 } });
    
    for (const wallet of wallets) {
      const provisional = wallet.provisionalBalance;
      const user = await User.findById(wallet.user);
      
      if (!user) {
        console.error(`[PayoutCycle] User not found for wallet ${wallet._id}`);
        continue;
      }

      // Calculate TDS based on Indian Tax Laws (approximate annual projection)
      // Assuming hasPAN is true for now, in production check user docs
      const hasPAN = user.kycStatus === 'approved'; 
      const tdsResult = calculateTDS(provisional, provisional * 12, hasPAN);

      if (tdsResult.tdsAmount > 0) {
        wallet.ledger.push({
          amount: -tdsResult.tdsAmount,
          type: 'tds_deduction',
          description: `TDS @ ${tdsResult.tdsRate}% for cycle ${cycleMonth}`,
          cycleMonth,
          status: 'final',
          date: new Date()
        });
      }

      const netPayout = tdsResult.netAmount;
      
      // Move funds to final balance
      wallet.finalBalance += netPayout;
      wallet.provisionalBalance = 0;

      // Update statuses of provisional entries in ledger for this cycle
      wallet.ledger.forEach((entry: any) => {
        if (entry.cycleMonth === cycleMonth && entry.status === 'provisional') {
          entry.status = 'final';
        }
      });

      wallet.ledger.push({
        amount: 0, // Zero entry just to log completion
        type: 'direct', // Generic type for log
        description: `Cycle ${cycleMonth} settled. Net payout: ₹${netPayout}`,
        cycleMonth,
        status: 'final',
        date: new Date()
      });

      await wallet.save();
      console.log(`[PayoutCycle] Settled wallet for ${user.memberId}: Net ₹${netPayout}`);
    }
    
    console.log(`[PayoutCycle] Completed payout for ${wallets.length} wallets.`);
  } catch (error) {
    console.error('[PayoutCycle] Error during payout cycle:', error);
  }
}

/**
 * Schedule cron: 5th of every month at 09:00 AM
 */
export function schedulePayoutCycle(): void {
  cron.schedule('0 9 5 * *', async () => {
    const now = new Date();
    // Get last month in YYYY-MM format
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cycleMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`[Cron] Triggering payout cycle for ${cycleMonth}`);
    await runPayoutCycle(cycleMonth);
  });
}
