import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/authMiddleware';

/**
 * GET /api/auth/me
 * Returns the current authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await verifyAuth(request);
  if (result instanceof NextResponse) return result;

  const { user } = result;
  return NextResponse.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      rank: user.rank,
      memberId: user.memberId,
      state: user.state,
      status: user.status,
      kycStatus: user.kycStatus,
      personalSalesCount: user.personalSalesCount,
      teamSize: user.teamSize,
      joiningDate: user.joiningDate,
    },
  });
}

/** DELETE /api/auth/me — Logout */
export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.delete('auth_token');
  return response;
}
