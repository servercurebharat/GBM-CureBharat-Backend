import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import EPin from '../../../models/EPin';
import { verifyAuth } from '../../../lib/authMiddleware';

/**
 * GET /api/epins/my-pins
 * Get current user's pin inventory (unused pins)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'unused';

  const pins = await EPin.find({
    currentOwnerId: auth.user._id,
    status,
  })
    .populate('planId', 'name price')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, data: pins, count: pins.length });
}
