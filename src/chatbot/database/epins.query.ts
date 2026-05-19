import EPin from '../../models/EPin';

export const getEPinCount = async (userId: string) => {
  try {
    const activeCount = await EPin.countDocuments({ currentOwnerId: userId, status: 'active' });
    const usedCount = await EPin.countDocuments({ currentOwnerId: userId, status: 'used' });
    return { activeCount, usedCount };
  } catch (error) {
    console.error('[Chatbot DB] getEPinCount Error:', error);
    return { activeCount: 0, usedCount: 0 };
  }
};
