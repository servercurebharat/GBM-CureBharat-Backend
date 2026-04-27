import cron from 'node-cron';
import User from '../models/User';

/**
 * Runs on 1st of every month at 00:01
 * Marks users inactive if they had 0 sales last month
 * Resets monthly sales counter for new cycle
 */
export async function runMonthlyActivityCheck(): Promise<void> {
  console.log('[ActivityCheck] Starting monthly audit...');
  
  try {
    const users = await User.find({ role: { $ne: 'admin' } });
    
    for (const user of users) {
      const salesLastMonth = user.personalSalesThisMonth;
      
      if (salesLastMonth < 1) {
        user.status = 'inactive';
        console.log(`[ActivityCheck] ${user.memberId} marked inactive (0 sales)`);
      } else {
        user.status = 'active';
        console.log(`[ActivityCheck] ${user.memberId} is active (${salesLastMonth} sales)`);
      }
      
      // Reset monthly sales counter for the new cycle
      user.personalSalesThisMonth = 0;
      await user.save();
    }
    
    console.log('[ActivityCheck] Monthly activity audit completed successfully.');
  } catch (error) {
    console.error('[ActivityCheck] Error during monthly audit:', error);
  }
}

/**
 * Schedule cron: 1st of every month at 00:01
 */
export function scheduleActivityCheck(): void {
  cron.schedule('1 0 1 * *', async () => {
    console.log('[Cron] Triggering monthly activity check...');
    await runMonthlyActivityCheck();
  });
}
