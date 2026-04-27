import { Response } from 'express';
import Wallet from '../models/Wallet';
import User from '../models/User';
import { runPayoutCycle } from '../lib/payoutCycle';

export const getMyWallet = async (req: any, res: Response) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id })
      .populate('ledger.sourceUserId', 'name memberId')
      .lean() as any;

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Sort ledger by date descending
    const sortedLedger = wallet.ledger.sort((a: any, b: any) => b.date - a.date);

    return res.status(200).json({
      success: true,
      data: {
        provisionalBalance: wallet.provisionalBalance,
        finalBalance: wallet.finalBalance,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn,
        ledger: sortedLedger.slice(0, 50) // Return last 50 entries
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
    if (!wallet || wallet.finalBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient final balance' });
    }

    // 1. Deduct from balance
    wallet.finalBalance -= amount;
    wallet.totalWithdrawn += amount;

    // 2. Add ledger entry
    wallet.ledger.push({
      amount: -amount,
      type: 'withdrawal',
      description: `Withdrawal request for ₹${amount}`,
      status: 'final',
      date: new Date(),
      cycleMonth: '' // Not tied to a specific cycle
    });

    await wallet.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Withdrawal request submitted and balance updated' 
    });

  } catch (error: any) {
    console.error('[Wallet] requestWithdrawal Error:', error);
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

    // Find all wallets with provisional balance > 0
    const wallets = await Wallet.find({ provisionalBalance: { $gt: 0 } })
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
