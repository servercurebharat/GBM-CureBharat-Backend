import { Request, Response } from 'express';
import User from '../models/User';

export const getDownline = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Use MongoDB Aggregation Pipeline for efficient tree fetching
    const tree = await User.aggregate([
      { $match: { _id: id } },
      {
        $graphLookup: {
          from: 'users',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'referrerId',
          as: 'downline',
          maxDepth: 5, // Limit depth for performance in genealogy view
          depthField: 'level'
        }
      }
    ]);

    if (!tree || tree.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      data: tree[0]
    });
  } catch (error: any) {
    console.error('[User] getDownline Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const updateKYC = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { aadhaarNumber, panNumber, bankName, accountNumber, ifscCode } = req.body;

    // Security: Only user themselves or admin can update
    if (req.user._id.toString() !== id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update logic
    if (req.user.role === 'admin' && req.body.kycStatus) {
      user.kycStatus = req.body.kycStatus;
    } else {
      user.kycStatus = 'pending'; // Reset to pending if user updates details
    }

    // Note: In production, store these in a sub-document or encrypted fields
    // For now, we are just marking the status
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'KYC documents updated and status set to pending for review',
      data: { kycStatus: user.kycStatus }
    });

  } catch (error: any) {
    console.error('[User] updateKYC Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getAllUsers = async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    let query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean() as any;

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error: any) {
    console.error('[User] getAllUsers Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
