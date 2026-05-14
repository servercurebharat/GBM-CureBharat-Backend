import { Response } from 'express';
import User from '../models/User';
import Sale from '../models/Sale';
import mongoose from 'mongoose';

export const getTeamStats = async (req: any, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // 1. Get all downline user IDs using graphLookup
    const downline = await User.aggregate([
      { $match: { _id: userId } },
      {
        $graphLookup: {
          from: 'users',
          startWith: '$_id', 
          connectFromField: '_id',
          connectToField: 'referrerId',
          as: 'allDownline',
          depthField: 'level'
        }
      }
    ]);

    const team = downline[0]?.allDownline || [];
    const totalMembers = team.length;
    const activeMembers = team.filter((u: any) => u.status === 'active').length;
    const maxDepth = team.length > 0 ? Math.max(...team.map((u: any) => u.level)) + 1 : 0;
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newJoins = team.filter((u: any) => new Date(u.createdAt) > oneDayAgo).length;

    const roleDistribution = {
      sh: team.filter((u: any) => u.role === 'sh').length,
      hba: team.filter((u: any) => u.role === 'hba').length,
      hcm: team.filter((u: any) => u.role === 'hcm').length,
      hcc: team.filter((u: any) => u.role === 'hcc').length,
    };

    return res.status(200).json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        maxDepth,
        newJoins,
        roleDistribution
      }
    });
  } catch (error: any) {
    console.error('[Team] getTeamStats Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getTeamList = async (req: any, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { role, search, page = 1, limit = 10, parentId, state } = req.query;

    let query: any = {};
    if (parentId) {
      query = { referrerId: new mongoose.Types.ObjectId(parentId as string) };
    } else {
      // Always find direct downline for the current user
      query = { referrerId: userId };
      if (role) query.role = role;
    }

    if (state) {
      query.state = state;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    const members = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean() as any[];

    // For each member, calculate some stats (total sales in their team, etc.)
    const enrichedMembers = await Promise.all(members.map(async (m) => {
      // Simple count of their directs
      const directCount = await User.countDocuments({ referrerId: m._id });
      
      // Calculate team sales for this member
      const sales = await Sale.find({ 
        $or: [
          { sellerId: m._id },
          { hccId: m._id },
          { hcmId: m._id },
          { hbaId: m._id },
          { shId: m._id }
        ],
        status: 'active'
      });
      const teamSalesValue = sales.reduce((acc, s) => acc + s.saleAmount, 0);

      return {
        ...m,
        directCount,
        teamSalesValue,
        overrideValue: Math.round(teamSalesValue * 0.02) // Example 2% override for display
      };
    }));

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: enrichedMembers,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error: any) {
    console.error('[Team] getTeamList Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
