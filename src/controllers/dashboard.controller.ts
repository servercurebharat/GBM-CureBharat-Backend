import { Response } from 'express';
import User from '../models/User';
import Sale from '../models/Sale';
import Withdrawal from '../models/Withdrawal';
import mongoose from 'mongoose';

export const getDashboardSummary = async (req: any, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const role = req.user.role;
    const { period, state } = req.query;
    
    // 1. Core Metrics
    let userQuery: any = {};
    let saleQuery: any = { status: 'active' };
    
    if (role !== 'admin') {
      // Find all downline for stats
      const downline = await User.aggregate([
        { $match: { _id: userId } },
        {
          $graphLookup: {
            from: 'users',
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'referrerId',
            as: 'allDownline'
          }
        }
      ]);
      const teamIds = downline[0]?.allDownline.map((u: any) => u._id) || [];
      teamIds.push(userId); // include self
      
      userQuery = { _id: { $in: teamIds } };
      saleQuery = { 
        $and: [
          { status: 'active' },
          { $or: [{ sellerId: { $in: teamIds } }, { hcmId: { $in: teamIds } }, { hbaId: { $in: teamIds } }, { shId: { $in: teamIds } }] }
        ]
      };
    }

    // Apply Filters
    if (state && state !== 'all') {
      userQuery.state = state;
      saleQuery.$and = saleQuery.$and || [];
      saleQuery.$and.push({ customerState: state });
    }

    if (period && period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      if (period === 'mtd') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'ytd') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      
      saleQuery.$and = saleQuery.$and || [];
      saleQuery.$and.push({ createdAt: { $gte: startDate } });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      revenueStats,
      stateStats,
      roleDistribution
    ] = await Promise.all([
      User.countDocuments(userQuery),
      User.countDocuments({ ...userQuery, status: 'active' }),
      Sale.aggregate([
        { $match: saleQuery },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: '$saleAmount' },
            ftdRevenue: {
              $sum: { $cond: [{ $gte: ['$createdAt', today] }, '$saleAmount', 0] }
            },
            mtdRevenue: {
              $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$saleAmount', 0] }
            }
          } 
        }
      ]),
      Sale.aggregate([
        { $match: saleQuery },
        { $group: { _id: '$customerState', revenue: { $sum: '$saleAmount' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ]),
      User.aggregate([
        { $match: userQuery },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    ]);

    const inactiveUsers = totalUsers - activeUsers;
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const ftdRevenue = revenueStats[0]?.ftdRevenue || 0;
    const mtdRevenue = revenueStats[0]?.mtdRevenue || 0;

    // 2. Revenue Trends (Last 5 Weeks)
    const weeklyRevenue = await Promise.all(
      Array.from({ length: 5 }).map(async (_, i) => {
        const start = new Date();
        start.setDate(today.getDate() - (i * 7 + today.getDay()));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        
        const weekAgg = await Sale.aggregate([
          { $match: { ...saleQuery, createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, revenue: { $sum: '$saleAmount' } } }
        ]);

        return {
          label: i === 0 ? 'Current' : `WK ${5 - i}`,
          revenue: weekAgg[0]?.revenue || 0
        };
      })
    );
    weeklyRevenue.reverse(); // So it goes from WK 1 -> Current

    // 3. State Contribution (Dynamic)
    const stateContribution = stateStats.map(s => ({ 
      state: s._id || 'Unknown', 
      revenue: s.revenue 
    }));

    // 5. Pending Withdrawals (Admin only)
    let pendingWithdrawals = [];
    if (role === 'admin') {
      pendingWithdrawals = await Withdrawal.find({ status: 'pending' })
        .populate('user', 'name role memberId')
        .sort({ createdAt: -1 })
        .limit(5);
    }

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          totalRevenue,
          ftdRevenue,
          mtdRevenue
        },
        revenueTrends: weeklyRevenue,
        stateContribution,
        roleDistribution: roleDistribution.map(r => ({ role: r._id, count: r.count })),
        pendingWithdrawals
      }
    });

  } catch (error: any) {
    console.error('[Dashboard] Summary Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getTopLeaders = async (req: any, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const role = req.user.role;

    const { role: filterRole } = req.query;
    let filterRoleNormalized = filterRole ? (filterRole as string).toLowerCase() : undefined;
    if (filterRoleNormalized === 'hcb') {
      filterRoleNormalized = 'hba';
    }

    let targetRole = '';
    let query: any = {};

    switch (role) {
      case 'admin':
        targetRole = filterRoleNormalized ? filterRoleNormalized : 'hcc';
        query = { role: targetRole };
        break;
      case 'sh':
        targetRole = filterRoleNormalized ? filterRoleNormalized : 'hba';
        query = { role: targetRole, referrerId: userId };
        break;
      case 'hba':
      case 'hcb':
        targetRole = filterRoleNormalized ? filterRoleNormalized : 'hcm';
        query = { role: targetRole, referrerId: userId };
        break;
      case 'hcm':
        targetRole = filterRoleNormalized ? filterRoleNormalized : 'hcc';
        query = { role: targetRole, referrerId: userId };
        break;
      case 'hcc':
        targetRole = 'hcc';
        const me = await User.findById(userId);
        query = { role: 'hcc', referrerId: me?.referrerId, _id: { $ne: userId } };
        break;
    }

    const leaders = await User.find(query).limit(10).lean();

    const enrichedLeaders = await Promise.all(leaders.map(async (m: any) => {
      // Directs count
      let nextRole = '';
      if (m.role === 'sh') nextRole = 'hba';
      else if (m.role === 'hba') nextRole = 'hcm';
      else if (m.role === 'hcm') nextRole = 'hcc';
      
      const directCount = nextRole ? await User.countDocuments({ referrerId: m._id, role: nextRole }) : 0;
      
      // Team Sales
      const salesAgg = await Sale.aggregate([
        { 
          $match: { 
            status: 'active',
            $or: [{ sellerId: m._id }, { hcmId: m._id }, { hbaId: m._id }, { shId: m._id }] 
          }
        },
        { $group: { _id: null, total: { $sum: '$saleAmount' } } }
      ]);
      const teamSalesValue = salesAgg[0]?.total || 0;

      return {
        _id: m._id,
        name: m.name,
        memberId: m.memberId,
        state: m.state,
        role: m.role,
        directCount,
        teamSalesValue,
        overrideValue: Math.round(teamSalesValue * 0.02),
        totalIncome: Math.round(teamSalesValue * 0.02) // Real calculation
      };
    }));

    // Sort by total income
    enrichedLeaders.sort((a, b) => b.totalIncome - a.totalIncome);

    return res.status(200).json({
      success: true,
      data: enrichedLeaders
    });

  } catch (error: any) {
    console.error('[Dashboard] Top Leaders Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
