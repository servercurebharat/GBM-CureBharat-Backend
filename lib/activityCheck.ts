import { connectDB } from './db';
import User from '../models/User';

/**
 * Monthly activity check — runs on the 1st of every month via cron.
 *
 * Rules:
 * - Any user with personalSalesThisMonth < 1 → status = 'inactive'
 * - Reset personalSalesThisMonth = 0 for the new cycle
 *
 * Called by: app/api/cron/activity-check/route.ts (Vercel cron job)
 */
export async function runMonthlyActivityCheck(): Promise<{
  processedCount: number;
  markedInactive: number;
}> {
  await connectDB();

  let processedCount = 0;
  let markedInactive = 0;

  // Process in batches to avoid memory overload on large user bases
  const BATCH_SIZE = 200;
  let skip = 0;

  while (true) {
    const users = await User.find(
      { role: { $nin: ['admin'] } },
      { _id: 1, personalSalesThisMonth: 1, status: 1, memberId: 1 }
    )
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    if (users.length === 0) break;

    const inactiveIds = users
      .filter((u) => u.personalSalesThisMonth < 1)
      .map((u) => u._id);

    const activeIds = users
      .filter((u) => u.personalSalesThisMonth >= 1)
      .map((u) => u._id);

    // Mark inactive users
    if (inactiveIds.length > 0) {
      await User.updateMany(
        { _id: { $in: inactiveIds } },
        { $set: { status: 'inactive', personalSalesThisMonth: 0 } }
      );
      markedInactive += inactiveIds.length;
    }

    // Reset counter for active users — keep their active status
    if (activeIds.length > 0) {
      await User.updateMany(
        { _id: { $in: activeIds } },
        { $set: { personalSalesThisMonth: 0 } }
      );
    }

    processedCount += users.length;
    skip += BATCH_SIZE;
  }

  console.log(
    `✅ Monthly activity check complete. ` +
    `Processed: ${processedCount}, Marked inactive: ${markedInactive}`
  );

  return { processedCount, markedInactive };
}
