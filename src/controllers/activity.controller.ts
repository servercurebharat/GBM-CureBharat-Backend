import { Request, Response } from 'express';
import ActivityLog from '../models/ActivityLog';

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const { role, category, search, page = 1, limit = 50 } = req.query;

    const query: any = {};

    if (role && role !== 'All') {
      query.userRole = role.toString().toLowerCase();
    }

    if (category && category !== 'All') {
      query.category = category.toString().toLowerCase();
    }

    if (search) {
      query.$or = [
        { userName: { $regex: search.toString(), $options: 'i' } },
        { action: { $regex: search.toString(), $options: 'i' } },
        { details: { $regex: search.toString(), $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('userId', 'totalTimeSpent')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ActivityLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
