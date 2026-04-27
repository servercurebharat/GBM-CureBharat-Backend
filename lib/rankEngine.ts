import { connectDB } from './db';
import User from '../models/User';

const HCC_TO_HCM_SALES = 12;
const HCC_TO_HCM_TEAM = 12;
const HCM_TO_HBA_DOWNLINE_HCM = 3;

/**
 * Evaluate a user's current metrics and promote them if rank criteria are met.
 * Promotion is one-level at a time — HCC→HCM or HCM→HBA.
 *
 * Promotion rules:
 *   HCC → HCM: personalSalesCount >= 12 AND teamSize >= 12
 *   HCM → HBA: has 3+ HCM-rank users in direct downline
 *
 * @param userId - MongoDB ObjectId string of the user to evaluate
 */
export async function checkAndPromote(userId: string): Promise<void> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  // --- HCC → HCM ---
  if (user.rank === 'HCC') {
    if (
      user.personalSalesCount >= HCC_TO_HCM_SALES &&
      user.teamSize >= HCC_TO_HCM_TEAM
    ) {
      user.rank = 'HCM';
      user.role = 'hcm';
      await user.save();

      console.log(
        `🎉 PROMOTED: ${user.memberId} (${user.name}) → HCM. ` +
        `Sales: ${user.personalSalesCount}, Team: ${user.teamSize}`
      );

      // TODO: Integrate SMS/push notification here
      // await sendNotification(user.mobile, 'Congratulations! You have been promoted to HCM.');
    }
    return;
  }

  // --- HCM → HBA ---
  if (user.rank === 'HCM') {
    const downlineHcmCount = await User.countDocuments({
      referrerId: user._id,
      rank: 'HCM',
    });

    if (downlineHcmCount >= HCM_TO_HBA_DOWNLINE_HCM) {
      user.rank = 'HBA';
      user.role = 'hba';
      await user.save();

      console.log(
        `🎉 PROMOTED: ${user.memberId} (${user.name}) → HBA. ` +
        `Direct HCMs in downline: ${downlineHcmCount}`
      );

      // TODO: Integrate SMS/push notification here
    }
    return;
  }
}
