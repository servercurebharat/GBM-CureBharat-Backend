import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import User from '../../../models/User';
import { verifyAuth, requireRole } from '../../../lib/authMiddleware';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/users/[id]
 * Get user profile — user can fetch their own, admin can fetch any
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const canAccess =
    auth.user._id.toString() === params.id ||
    ['admin', 'sh'].includes(auth.user.role);

  if (!canAccess) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const user = await User.findById(params.id).select('-password').lean();

  if (!user) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}

/**
 * PUT /api/users/[id]/kyc
 * Update KYC documents — user updates their own KYC, admin can approve
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { kycDocuments, kycStatus } = body;

  await connectDB();

  const update: Record<string, unknown> = {};

  // User updating their own KYC docs
  if (kycDocuments && auth.user._id.toString() === params.id) {
    update.kycDocuments = kycDocuments;
    update.kycStatus = 'pending'; // Reset to pending on doc update
  }

  // Admin approving/rejecting KYC
  if (kycStatus && ['admin'].includes(auth.user.role)) {
    update.kycStatus = kycStatus;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
  }

  const updated = await User.findByIdAndUpdate(
    params.id,
    { $set: update },
    { new: true }
  ).select('-password').lean();

  return NextResponse.json({ success: true, data: updated });
}
