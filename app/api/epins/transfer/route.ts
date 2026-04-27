import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import EPin from '../../../models/EPin';
import { verifyAuth } from '../../../lib/authMiddleware';

/**
 * POST /api/epins/transfer
 * Transfer unused pins from current owner to another user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { pinCodes, toUserId } = await request.json();

  if (!pinCodes?.length || !toUserId) {
    return NextResponse.json(
      { success: false, message: 'pinCodes array and toUserId are required' },
      { status: 400 }
    );
  }

  await connectDB();

  const pins = await EPin.find({
    pinCode: { $in: pinCodes },
    currentOwnerId: auth.user._id,
    status: 'unused',
  });

  if (pins.length !== pinCodes.length) {
    return NextResponse.json(
      { success: false, message: 'Some pins not found or not owned by you' },
      { status: 400 }
    );
  }

  const now = new Date();
  await EPin.updateMany(
    { pinCode: { $in: pinCodes }, currentOwnerId: auth.user._id },
    {
      $set: { currentOwnerId: toUserId },
      $push: {
        transferHistory: {
          fromUserId: auth.user._id,
          toUserId,
          transferredAt: now,
        },
      },
    }
  );

  return NextResponse.json({
    success: true,
    message: `${pinCodes.length} pin(s) transferred successfully`,
  });
}
