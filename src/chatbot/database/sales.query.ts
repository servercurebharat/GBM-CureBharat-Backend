import Sale from '../../models/Sale';

export const getSalesCount = async (userId: string, role: string) => {
  try {
    let query: any = {};
    if (role === 'hcc') query.hccId = userId;
    else if (role === 'hcm') query.hcmId = userId;
    else if (role === 'hba') query.hbaId = userId;
    else if (role === 'sh') query.shId = userId;
    else query.hccId = userId; // fallback

    const count = await Sale.countDocuments(query);
    return count;
  } catch (error) {
    console.error('[Chatbot DB] getSalesCount Error:', error);
    return 0;
  }
};

export const getLatestSale = async (userId: string, role: string) => {
  try {
    let query: any = {};
    if (role === 'hcc') query.hccId = userId;
    else if (role === 'hcm') query.hcmId = userId;
    else if (role === 'hba') query.hbaId = userId;
    else if (role === 'sh') query.shId = userId;
    else query.hccId = userId; // fallback

    const sale: any = await Sale.findOne(query).sort({ createdAt: -1 }).lean();
    return sale;
  } catch (error) {
    console.error('[Chatbot DB] getLatestSale Error:', error);
    return null;
  }
};
