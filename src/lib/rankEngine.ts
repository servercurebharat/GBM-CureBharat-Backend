import User, { IUser } from '../models/User';

/**
 * Auto-promotion engine.
 * Checks if user qualifies for rank upgrade after each sale.
 */
export async function checkAndPromote(userId: string): Promise<void> {
  console.log(`[RankEngine] Checking promotions for user: ${userId}`);

  const user = await User.findById(userId);
  if (!user) return;

  // 1. HCC → HCM promotion
  if (user.rank === 'HCC') {
    const directReferralsCount = await User.countDocuments({ referrerId: user._id });
    
    // Criteria: 12 Personal Sales AND 12 Direct Referrals
    if (user.personalSalesCount >= 12 && directReferralsCount >= 12) {
      console.log(`[RankEngine] User ${user.memberId} promoted to HCM`);
      user.rank = 'HCM';
      user.role = 'hcm';
      user.status = 'active';
      await user.save();
      
      await sendPromotionNotification(user, 'HCM');
      
      // Update teamSize counts recursively for uplines
      await updateUplineTeamSize(user.referrerId as any);
      return;
    }
  }

  // 2. HCM → HBA promotion
  if (user.rank === 'HCM') {
    // Criteria: 3 HCMs in direct downline
    const hcmDownlineCount = await User.countDocuments({ 
      referrerId: user._id, 
      rank: 'HCM' 
    });

    if (hcmDownlineCount >= 3) {
      console.log(`[RankEngine] User ${user.memberId} promoted to HBA`);
      user.rank = 'HBA';
      user.role = 'hba';
      await user.save();
      
      await sendPromotionNotification(user, 'HBA');
      return;
    }
  }

  // 3. HBA → SH promotion
  if (user.rank === 'HBA') {
    // Future: Define SH promotion criteria (e.g. 3 HBAs)
    const hbaDownlineCount = await User.countDocuments({
      referrerId: user._id,
      rank: 'HBA'
    });

    if (hbaDownlineCount >= 3) {
      console.log(`[RankEngine] User ${user.memberId} promoted to SH`);
      user.rank = 'SH';
      user.role = 'sh';
      await user.save();
      await sendPromotionNotification(user, 'SH');
    }
    return;
  }
}

async function updateUplineTeamSize(referrerId: string): Promise<void> {
  if (!referrerId) return;
  
  const upline = await User.findById(referrerId);
  if (upline) {
    upline.teamSize += 1;
    await upline.save();
    if (upline.referrerId) {
      await updateUplineTeamSize(upline.referrerId.toString());
    }
  }
}

async function sendPromotionNotification(
  user: IUser, 
  newRank: string
): Promise<void> {
  console.log(`[NOTIFICATION] User ${user.memberId} (${user.name}) promoted to ${newRank}`);
  
  // TODO: Integrate SMS gateway here
  // const message = `Congratulations ${user.name}! You have been promoted to ${newRank} in CureBharat. Keep it up!`;
  // await sendSMS(user.mobile, message);
}
