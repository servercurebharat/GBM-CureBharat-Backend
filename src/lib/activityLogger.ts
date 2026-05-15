import ActivityLog from '../models/ActivityLog';
import User from '../models/User';

export const logActivity = async (
  userId: string, 
  action: string, 
  category: 'auth' | 'financial' | 'network' | 'system' | 'kyc', 
  details: string, 
  ipAddress?: string,
  location?: { lat: number; lng: number; city?: string }
) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const log = new ActivityLog({
      userId,
      userName: user.name,
      userRole: user.role,
      action,
      category,
      details,
      ipAddress,
      location
    });

    await log.save();
    console.log(`[ACTIVITY LOG] ${user.name} (${user.role}) -> ${action} | Loc: ${location ? `${location.lat},${location.lng}` : 'NONE'}`);
  } catch (err) {
    console.error('Failed to log activity', err);
  }
};
