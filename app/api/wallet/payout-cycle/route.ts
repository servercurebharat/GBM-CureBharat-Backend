import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, requireRole } from '../../../lib/authMiddleware';
import { runPayoutCycle } from '../../../lib/payoutCycle';

/**
 * POST /api/wallet/payout-cycle
 * Admin only: Trigger the monthly payout cycle
 * Also called by Vercel cron on the 5th of every month
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth.user, ['admin']);
  if (roleCheck) return roleCheck;

  const { cycleMonth } = await request.json();
  if (!cycleMonth || !/^\d{4}-\d{2}$/.test(cycleMonth)) {
    return NextResponse.json(
      { success: false, message: 'cycleMonth must be in YYYY-MM format' },
      { status: 400 }
    );
  }

  const result = await runPayoutCycle(cycleMonth);

  return NextResponse.json({
    success: true,
    message: `Payout cycle for ${cycleMonth} completed`,
    data: result,
  });
}
