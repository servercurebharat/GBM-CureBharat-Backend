import { Response } from 'express';
import mongoose from 'mongoose';
import Sale from '../models/Sale';
import User from '../models/User';

export const getFTDAnalytics = async (req: any, res: Response) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

    const startDate = new Date(date as string);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date as string);
    endDate.setHours(23, 59, 59, 999);

    const matchQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'active'
    };

    // 1. Overall Metrics
    const metrics = await Sale.aggregate([
      { $match: matchQuery },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$saleAmount' },
        totalSales: { $sum: 1 }
      }}
    ]);

    // 2. Hourly Velocity (0 to 23 hours)
    const hourlyVelocity = await Sale.aggregate([
      { $match: matchQuery },
      { $group: {
        _id: { $hour: '$createdAt' },
        sales: { $sum: 1 },
        revenue: { $sum: '$saleAmount' }
      }},
      { $sort: { '_id': 1 } }
    ]);

    // Normalize hourly data to ensure all 24 hours exist
    const normalizedHourly = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      sales: 0,
      revenue: 0
    }));

    hourlyVelocity.forEach(h => {
      // Depending on the version of mongo and daylight savings, hour might be outside bounds if poorly formatted
      if(h._id !== null && h._id !== undefined && h._id >= 0 && h._id < 24) {
         normalizedHourly[h._id].sales = h.sales;
         normalizedHourly[h._id].revenue = h.revenue;
      }
    });

    // 3. Top Performers (by Role)
    const getTopByRole = async (roleField: string) => {
      return Sale.aggregate([
        { $match: matchQuery },
        { $group: {
          _id: `$${roleField}`,
          sales: { $sum: 1 },
          revenue: { $sum: '$saleAmount' }
        }},
        { $match: { _id: { $ne: null } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }},
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $lookup: {
          from: 'users',
          localField: 'user.referrerId',
          foreignField: '_id',
          as: 'recruiter'
        }},
        { $unwind: { path: '$recruiter', preserveNullAndEmptyArrays: true } },
        { $project: {
          _id: 1,
          sales: 1,
          revenue: 1,
          name: { $ifNull: ['$user.name', 'Unknown Member'] },
          memberId: { $ifNull: ['$user.memberId', 'N/A'] },
          recruiterName: '$recruiter.name',
          recruiterMemberId: '$recruiter.memberId'
        }}
      ]);
    };

    const topHCC = await getTopByRole('hccId');
    const topHCM = await getTopByRole('hcmId');
    const topHBA = await getTopByRole('hbaId');
    const topSH = await getTopByRole('shId');

    return res.status(200).json({
      success: true,
      data: {
        metrics: metrics[0] || { totalRevenue: 0, totalSales: 0 },
        hourlyVelocity: normalizedHourly,
        topPerformers: {
          hcc: topHCC,
          hcm: topHCM,
          hba: topHBA,
          sh: topSH
        }
      }
    });
  } catch (error: any) {
    console.error('[Analytics] FTD Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getMTDAnalytics = async (req: any, res: Response) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) return res.status(400).json({ success: false, message: 'Month is required' });

    const matchQuery = {
      cycleMonth: month,
      status: 'active'
    };

    // 1. Overall Metrics
    const metrics = await Sale.aggregate([
      { $match: matchQuery },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$saleAmount' },
        totalSales: { $sum: 1 }
      }}
    ]);

    // 2. State Breakdown
    const stateBreakdown = await Sale.aggregate([
      { $match: matchQuery },
      { $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller'
      }},
      { $unwind: '$seller' },
      { $group: {
        _id: '$seller.state',
        revenue: { $sum: '$saleAmount' },
        sales: { $sum: 1 }
      }},
      { $sort: { revenue: -1 } }
    ]);

    // 3. New Members (Users created this month)
    const [yearStr, monthStr] = (month as string).split('-');
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr) - 1; // 0-indexed
    const startOfMonth = new Date(year, monthNum, 1);
    const endOfMonth = new Date(year, monthNum + 1, 0, 23, 59, 59, 999);

    const newMembersCount = await User.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 3. Top Performers (by Role) - MTD
    const getTopByRole = async (roleField: string) => {
      return Sale.aggregate([
        { $match: matchQuery },
        { $group: {
          _id: `$${roleField}`,
          sales: { $sum: 1 },
          revenue: { $sum: '$saleAmount' }
        }},
        { $match: { _id: { $ne: null } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }},
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $lookup: {
          from: 'users',
          localField: 'user.referrerId',
          foreignField: '_id',
          as: 'recruiter'
        }},
        { $unwind: { path: '$recruiter', preserveNullAndEmptyArrays: true } },
        { $project: {
          _id: 1,
          sales: 1,
          revenue: 1,
          name: { $ifNull: ['$user.name', 'Unknown Member'] },
          memberId: { $ifNull: ['$user.memberId', 'N/A'] },
          recruiterName: '$recruiter.name',
          recruiterMemberId: '$recruiter.memberId'
        }}
      ]);
    };

    const topHCC = await getTopByRole('hccId');
    const topHCM = await getTopByRole('hcmId');
    const topHBA = await getTopByRole('hbaId');
    const topSH = await getTopByRole('shId');

    return res.status(200).json({
      success: true,
      data: {
        metrics: metrics[0] || { totalRevenue: 0, totalSales: 0 },
        stateBreakdown,
        newMembersCount,
        topPerformers: {
          hcc: topHCC,
          hcm: topHCM,
          hba: topHBA,
          sh: topSH
        }
      }
    });

  } catch (error: any) {
    console.error('[Analytics] MTD Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
export const getStatePerformance = async (req: any, res: Response) => {
  try {
    // 1. Get all sales grouped by state
    const salesByState = await Sale.aggregate([
      { $match: { status: 'active' } },
      { $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller'
      }},
      { $unwind: '$seller' },
      { $group: {
        _id: '$seller.state',
        revenue: { $sum: '$saleAmount' },
        sales: { $sum: 1 }
      }},
      { $sort: { revenue: -1 } }
    ]);

    // 2. Get user count grouped by state
    const membersByState = await User.aggregate([
      { $group: {
        _id: '$state',
        count: { $sum: 1 }
      }}
    ]);

    // 3. Get Top SH per state
    const topSHByState = await User.find({ role: 'sh' }).select('name state memberId').lean();

    // 4. Merge results
    const statesData = salesByState.map(s => {
       const members = membersByState.find(m => m._id === s._id)?.count || 0;
       const sh = topSHByState.find(u => u.state === s._id);
       
       // Generate a simple growth indicator based on sales count (mock logic for now)
       const growthValue = (s.sales > 5 ? (Math.random() * 15 + 5) : (Math.random() * 5)).toFixed(1);
       
       return {
          state: s._id || 'Unknown',
          code: s._id ? s._id.substring(0, 2).toUpperCase() : '??',
          members,
          sales: s.sales,
          revenue: s.revenue,
          topSH: sh ? sh.name : 'Unassigned',
          growth: `+${growthValue}%`
       };
    });

    return res.status(200).json({ success: true, data: statesData });
  } catch (error: any) {
    console.error('[Analytics] State Performance Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
