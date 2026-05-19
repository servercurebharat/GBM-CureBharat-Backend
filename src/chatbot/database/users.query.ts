import User from '../../models/User';

export const getKYCStatus = async (userId: string) => {
  try {
    const user: any = await User.findById(userId).select('kycStatus').lean();
    return user?.kycStatus || 'pending';
  } catch (error) {
    console.error('[Chatbot DB] getKYCStatus Error:', error);
    return 'unknown';
  }
};

export const getUserRank = async (userId: string) => {
  try {
    const user: any = await User.findById(userId).select('rank').lean();
    return user?.rank || 'HCC';
  } catch (error) {
    console.error('[Chatbot DB] getUserRank Error:', error);
    return 'unknown';
  }
};

export const getTeamSize = async (userId: string) => {
  try {
    // Assuming teamSize might be stored or we just count direct referrals
    const count = await User.countDocuments({ referrer: userId });
    return count;
  } catch (error) {
    console.error('[Chatbot DB] getTeamSize Error:', error);
    return 0;
  }
};

export const getSponsor = async (userId: string) => {
  try {
    const user: any = await User.findById(userId).populate('referrer', 'name mobile rank').lean();
    if (!user || !user.referrer) return null;
    return user.referrer;
  } catch (error) {
    console.error('[Chatbot DB] getSponsor Error:', error);
    return null;
  }
};

export const getTeamMembers = async (user: any) => {
  try {
    let query: any = {};

    switch (user.role?.toLowerCase()) {
      case 'admin':
        query = {
          role: { $ne: 'admin' }
        };
        break;

      case 'sh':
        query = {
          state: user.state,
          role: { $in: ['hba', 'hcm', 'hcc'] }
        };
        break;

      case 'hba':
        query = {
          role: { $in: ['hcm', 'hcc'] }
        };
        break;

      case 'hcm':
        query = {
          role: 'hcc'
        };
        break;

      default:
        return [];
    }

    const members = await User.find(query)
      .select('name role rank state memberId')
      .lean();

    return members;

  } catch (error) {
    console.error('[Chatbot DB] getTeamMembers Error:', error);
    return [];
  }
};