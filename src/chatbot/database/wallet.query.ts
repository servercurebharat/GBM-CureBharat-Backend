import Wallet from '../../models/Wallet';

export const getWalletBalance = async (userId: string) => {
  try {
    const wallet: any = await Wallet.findOne({ userId }).lean();
    if (!wallet) {
      return { finalBalance: 0, provisionalBalance: 0, totalEarned: 0 };
    }
    return {
      finalBalance: wallet.finalBalance || 0,
      provisionalBalance: wallet.provisionalBalance || 0,
      totalEarned: wallet.totalEarned || 0
    };
  } catch (error) {
    console.error('[Chatbot DB] getWalletBalance Error:', error);
    return { finalBalance: 0, provisionalBalance: 0, totalEarned: 0 };
  }
};

export const getWalletHistory = async (userId: string) => {
  try {
    const wallet: any = await Wallet.findOne({ userId }).lean();
    if (!wallet || !wallet.ledger) return [];
    
    // Return last 5 transactions
    return wallet.ledger.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  } catch (error) {
    console.error('[Chatbot DB] getWalletHistory Error:', error);
    return [];
  }
};
