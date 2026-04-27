import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import EPin from '../../../models/EPin';
import { verifyAuth } from '../../../lib/authMiddleware';

/**
 * POST /api/epins/burn
 * Use a pin during registration — marks it as used
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { pinCode } = await request.json();
  if (!pinCode) {
    return NextResponse.json({ success: false, message: 'pinCode is required' }, { status: 400 });
  }

  await connectDB();

  const pin = await EPin.findOne({ pinCode, status: 'unused' });
  if (!pin) {
    return NextResponse.json(
      { success: false, message: 'Pin not found, already used, or blocked' },
      { status: 400 }
    );
  }

  pin.status = 'used';
  pin.usedBy = auth.user._id;
  pin.usedAt = new Date();
  await pin.save();

  return NextResponse.json({
    success: true,
    message: 'Pin burned successfully',
    data: { pinCode: pin.pinCode, planId: pin.planId, value: pin.value },
  });
}
