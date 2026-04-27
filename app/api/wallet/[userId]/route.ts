import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import Wallet from '../../../models/Wallet';
import { verifyAuth } from '../../../lib/authMiddleware';

interface RouteParams {
  params: { userId: string };
}

/**
 * GET /api/wallet/[userId]
 * Get wallet balance and ledger for a user
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Only the user themselves or admin/sh can view wallet
  const canAccess =
    auth.user._id.toString() === params.userId ||
    ['admin', 'sh'].includes(auth.user.role);

  if (!canAccess) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const wallet = await Wallet.findOne({ userId: params.userId }).lean();

  if (!wallet) {
    return NextResponse.json({
      success: true,
      data: {
        provisionalBalance: 0,
        finalBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        ledger: [],
      },
    });
  }

  // Paginate ledger entries
  const ledger = wallet.ledger
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    success: true,
    data: {
      provisionalBalance: wallet.provisionalBalance,
      finalBalance: wallet.finalBalance,
      totalEarned: wallet.totalEarned,
      totalWithdrawn: wallet.totalWithdrawn,
      ledger,
      ledgerTotal: wallet.ledger.length,
    },
  });
}
