import { Response } from 'express';
import Wallet from '../models/Wallet';
import User from '../models/User';
import Withdrawal from '../models/Withdrawal';
import Sale from '../models/Sale';
import ActivityLog from '../models/ActivityLog';
import { runPayoutCycle } from '../lib/payoutCycle';
import crypto from 'crypto';
import { createNotification } from './notification.controller';

export const getMyWallet = async (req: any, res: Response) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id })
      .populate('ledger.sourceUserId', 'name memberId')
      .lean() as any;

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Sort ledger by date descending
    const sortedLedger = (wallet.ledger || []).sort((a: any, b: any) => b.date - a.date);

    // Calculate breakdown
    const breakdown = {
      direct: 0,
      override: 0,
      leadership: 0
    };

    (wallet.ledger || []).forEach((entry: any) => {
      if (entry.status === 'provisional' || entry.status === 'final') {
        if (entry.type === 'direct') breakdown.direct += entry.amount;
        if (entry.type === 'override') breakdown.override += entry.amount;
        if (entry.type === 'leadership') breakdown.leadership += entry.amount;
      }
    });

    // Fetch Withdrawal Stats
    const withdrawalStats = await Withdrawal.aggregate([
      { $match: { user: req.user._id } },
      { 
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$grossAmount' },
          totalTDS: { $sum: { $ifNull: ['$tdsAmount', 0] } }
        }
      }
    ]);

    let pendingCount = 0; let pendingValue = 0;
    let successfulCount = 0; let successfulValue = 0;
    let totalTDS = 0;

    withdrawalStats.forEach(stat => {
      totalTDS += stat.totalTDS;
      if (stat._id === 'pending' || stat._id === 'processing') {
        pendingCount += stat.count;
        pendingValue += stat.totalValue;
      } else if (stat._id === 'success') {
        successfulCount += stat.count;
        successfulValue += stat.totalValue;
      }
    });

    // Fetch Total Sales Value
    const salesAgg = await Sale.aggregate([
      { $match: { sellerId: req.user._id } },
      { $group: { _id: null, total: { $sum: '$saleAmount' } } }
    ]);
    const totalSalesValue = salesAgg[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        provisionalBalance: wallet.provisionalBalance,
        finalBalance: wallet.finalBalance,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn,
        totalSalesValue,
        pendingPayouts: { count: pendingCount, value: pendingValue },
        successfulPayouts: { count: successfulCount, value: successfulValue },
        totalTDS,
        earningsBreakdown: breakdown,
        ledger: sortedLedger.slice(0, 50)
      }
    });
  } catch (error: any) {
    console.error('[Wallet] getMyWallet Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const requestWithdrawal = async (req: any, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    const user = await User.findById(req.user._id);
    if (!user || user.kycStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'KYC must be approved for withdrawals' });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    if (wallet.frozen) {
      return res.status(403).json({ success: false, message: 'Your wallet has been frozen. Please contact support.' });
    }
    if (wallet.finalBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient final balance' });
    }

    // 1. Calculate TDS and Net
    const tdsAmount = Math.round(amount * 0.05); // 5% TDS
    const netAmount = amount - tdsAmount;

    // 2. Generate Request ID
    const requestId = `PAY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 3. Create Withdrawal Record
    const withdrawal = new Withdrawal({
      requestId,
      user: req.user._id,
      grossAmount: amount,
      tdsAmount,
      netAmount,
      status: 'pending',
      requestedAt: new Date()
    });

    await withdrawal.save();

    // 4. Deduct from balance
    wallet.finalBalance -= amount;
    wallet.totalWithdrawn += amount;

    // 5. Add ledger entry
    wallet.ledger.push({
      amount: -amount,
      type: 'withdrawal',
      description: `Withdrawal request ${requestId} for ₹${amount / 100}`,
      status: 'final',
      date: new Date(),
      cycleMonth: '' 
    });

    await wallet.save();

    // Trigger in-app notification to all admin users about the withdrawal request!
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id.toString(),
          'Withdrawal Requested',
          `Partner ${user.name} (${user.memberId}) has requested a withdrawal of ₹${(amount / 100).toFixed(2)}. Request ID: ${requestId}.`,
          'warning',
          `/admin/payouts`
        );
      }
    } catch (notifErr) {
      console.error('[Wallet] Admin notification failed:', notifErr);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Withdrawal request submitted successfully',
      data: withdrawal
    });

  } catch (error: any) {
    console.error('[Wallet] requestWithdrawal Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getMyWithdrawals = async (req: any, res: Response) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: withdrawals
    });
  } catch (error: any) {
    console.error('[Wallet] getMyWithdrawals Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const triggerPayoutCycle = async (req: any, res: Response) => {
  try {
    const { cycleMonth } = req.body;

    if (!cycleMonth || !/^\d{4}-\d{2}$/.test(cycleMonth)) {
      return res.status(400).json({ success: false, message: 'Invalid cycle month format (YYYY-MM)' });
    }

    // Role check is handled by middleware, but extra safety:
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // This is a manual trigger for the cron logic
    await runPayoutCycle(cycleMonth);

    return res.status(200).json({ 
      success: true, 
      message: `Manual payout cycle for ${cycleMonth} completed successfully` 
    });

  } catch (error: any) {
    console.error('[Wallet] triggerPayoutCycle Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getAllProvisional = async (req: any, res: Response) => {
  try {
    // Admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Find all wallets with provisional balance > 0 OR that are frozen
    const wallets = await Wallet.find({
      $or: [
        { provisionalBalance: { $gt: 0 } },
        { frozen: true }
      ]
    })
      .populate({
        path: 'user',
        select: 'name memberId role rank kycDocuments.panNumber kycStatus'
      });

    // Calculate summary
    let totalProvisional = 0;
    wallets.forEach((w: any) => {
      totalProvisional += w.provisionalBalance;
    });

    const estimatedTDS = Math.round(totalProvisional * 0.05); // 5% flat for simplicity in summary
    const netPayout = totalProvisional - estimatedTDS;

    return res.status(200).json({
      success: true,
      data: {
        wallets,
        summary: {
          totalProvisional,
          estimatedTDS,
          netPayout,
          walletCount: wallets.length
        }
      }
    });
  } catch (error: any) {
    console.error('[Wallet] getAllProvisional Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
export const getAllTransactions = async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    
    const pipeline: any[] = [
      { $unwind: '$ledger' }
    ];

    if (type && type !== 'All') {
      pipeline.push({ $match: { 'ledger.type': type.toLowerCase() } });
    }

    pipeline.push(
      { $sort: { 'ledger.date': -1 } },
      { 
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
      {
        $project: {
          _id: '$ledger._id',
          amount: '$ledger.amount',
          type: '$ledger.type',
          description: '$ledger.description',
          status: '$ledger.status',
          date: '$ledger.date',
          cycleMonth: '$ledger.cycleMonth',
          user: {
            _id: '$userDetails._id',
            name: '$userDetails.name',
            memberId: '$userDetails.memberId',
            role: '$userDetails.role'
          }
        }
      }
    );

    const transactions = await Wallet.aggregate(pipeline);
    
    const countPipeline: any[] = [{ $unwind: '$ledger' }];
    if (type && type !== 'All') {
      countPipeline.push({ $match: { 'ledger.type': type.toLowerCase() } });
    }
    countPipeline.push({ $count: 'total' });
    
    const totalCount = await Wallet.aggregate(countPipeline);

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: { 
        total: totalCount[0]?.total || 0, 
        page: Number(page), 
        limit: Number(limit) 
      }
    });
  } catch (error: any) {
    console.error('[Wallet] getAllTransactions Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
export const getAllWithdrawalRequests = async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { status = 'pending', page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    const withdrawals = await Withdrawal.find(filter)
      .populate('user', 'name memberId role kycStatus state')
      .sort({ requestedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Withdrawal.countDocuments(filter);

    return res.status(200).json({ 
      success: true, 
      data: withdrawals,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (error: any) {
    console.error('[Wallet] getAllWithdrawalRequests Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const updateWithdrawalStatus = async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { action, remarks } = req.body; // action: 'approve' | 'reject' | 'freeze'

    const withdrawal = await Withdrawal.findById(id).populate('user', 'name memberId _id');
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is no longer pending' });
    }

    if (action === 'approve') {
      withdrawal.status = 'success';
      (withdrawal as any).processedAt = new Date();
      (withdrawal as any).remarks = remarks || 'Approved by admin';
      await withdrawal.save();

      // Notify user
      await createNotification(
        (withdrawal.user as any)._id.toString(),
        'Payout Approved',
        `Your withdrawal request ${withdrawal.requestId} of ₹${(withdrawal.netAmount / 100).toFixed(2)} (after TDS) has been approved and will be disbursed shortly.`,
        'success',
        '/finance'
      );

    } else if (action === 'reject') {
      withdrawal.status = 'failed';
      (withdrawal as any).processedAt = new Date();
      (withdrawal as any).remarks = remarks || 'Rejected by admin';
      await withdrawal.save();

      // Refund the amount back to wallet
      const wallet = await Wallet.findOne({ user: (withdrawal.user as any)._id });
      if (wallet) {
        wallet.finalBalance += withdrawal.grossAmount;
        wallet.totalWithdrawn -= withdrawal.grossAmount;
        wallet.ledger.push({
          amount: withdrawal.grossAmount,
          type: 'withdrawal',
          description: `Refund: Withdrawal ${withdrawal.requestId} rejected - ${remarks || 'Admin action'}`,
          status: 'final',
          date: new Date(),
          cycleMonth: ''
        });
        await wallet.save();
      }

      await createNotification(
        (withdrawal.user as any)._id.toString(),
        'Payout Rejected',
        `Your withdrawal request ${withdrawal.requestId} has been rejected. Reason: ${remarks || 'Admin decision'}. Amount has been refunded to your wallet.`,
        'error',
        '/finance'
      );

    } else if (action === 'freeze') {
      // Freeze the user's wallet
      const wallet = await Wallet.findOne({ user: (withdrawal.user as any)._id });
      if (wallet) {
        (wallet as any).frozen = true;
        (wallet as any).frozenReason = remarks || 'Frozen by admin pending investigation';
        await wallet.save();
      }
      withdrawal.status = 'failed';
      (withdrawal as any).remarks = `Account frozen: ${remarks || 'Admin action'}`;
      await withdrawal.save();

      await createNotification(
        (withdrawal.user as any)._id.toString(),
        'Account Action Required',
        `Your wallet has been frozen pending review. Please contact support. Request ${withdrawal.requestId} has been placed on hold.`,
        'warning',
        '/support'
      );

    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use approve, reject, or freeze' });
    }

    return res.status(200).json({ success: true, message: `Withdrawal ${action}d successfully` });
  } catch (error: any) {
    console.error('[Wallet] updateWithdrawalStatus Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const unfreezeWallet = async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params; // wallet ID

    const wallet = await Wallet.findById(id).populate('user', 'name memberId _id');
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    wallet.frozen = false;
    wallet.frozenReason = '';
    await wallet.save();

    // Log action
    try {
      await ActivityLog.create({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'WALLET_UNFROZEN',
        category: 'wallet',
        details: `Unfrozen wallet for ${(wallet.user as any)?.name} (${(wallet.user as any)?.memberId})`,
        ipAddress: req.ip
      });
    } catch (logErr) {
      console.error('[Wallet] unfreezeWallet Log Error:', logErr);
    }

    // Notify user
    try {
      await createNotification(
        (wallet.user as any)._id.toString(),
        'Account Unfrozen',
        `Your wallet has been unfrozen. You can now request payouts.`,
        'success',
        '/finance'
      );
    } catch (notifErr) {
      console.error('[Wallet] unfreezeWallet Notification Error:', notifErr);
    }

    return res.status(200).json({ success: true, message: 'Wallet unfrozen successfully' });
  } catch (error: any) {
    console.error('[Wallet] unfreezeWallet Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
