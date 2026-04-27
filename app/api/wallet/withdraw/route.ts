import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import Wallet from '../../../models/Wallet';
import { verifyAuth } from '../../../lib/authMiddleware';

/**
 * POST /api/wallet/withdraw
 * Request a withdrawal from finalBalance
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { amount } = await request.json();
  if (!amount || amount <= 0) {
    return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
  }

  await connectDB();

  const wallet = await Wallet.findOne({ userId: auth.user._id });
  if (!wallet) {
    return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 });
  }

  if (wallet.finalBalance < amount) {
    return NextResponse.json(
      { success: false, message: `Insufficient balance. Available: ₹${wallet.finalBalance}` },
      { status: 400 }
    );
  }

  const cycleMonth = new Date().toISOString().slice(0, 7);

  wallet.finalBalance -= amount;
  wallet.totalWithdrawn += amount;
  wallet.ledger.push({
    type: 'withdrawal',
    amount: -amount,
    description: `Withdrawal request of ₹${amount}`,
    sourceUserId: auth.user._id,
    status: 'final',
    cycleMonth,
    createdAt: new Date(),
  });

  await wallet.save();

  return NextResponse.json({
    success: true,
    message: `Withdrawal of ₹${amount} requested successfully`,
    data: { newBalance: wallet.finalBalance },
  });
}
