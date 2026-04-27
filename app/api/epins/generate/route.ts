import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import EPin from '../../../models/EPin';
import Plan from '../../../models/Plan';
import { verifyAuth, requireRole } from '../../../lib/authMiddleware';

/**
 * POST /api/epins/generate
 * Admin only: Generate a batch of e-pins
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth.user, ['admin']);
  if (roleCheck) return roleCheck;

  const { planId, quantity, assignToUserId } = await request.json();

  if (!planId || !quantity || quantity < 1 || quantity > 500) {
    return NextResponse.json(
      { success: false, message: 'planId required, quantity must be 1–500' },
      { status: 400 }
    );
  }

  await connectDB();

  const plan = await Plan.findById(planId).lean();
  if (!plan) {
    return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
  }

  const ownerId = assignToUserId || auth.user._id;
  const pins: object[] = [];

  for (let i = 0; i < quantity; i++) {
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const pinCode = `CB-${suffix}`;
    pins.push({
      pinCode,
      planId,
      value: plan.price,
      generatedBy: auth.user._id,
      currentOwnerId: ownerId,
      status: 'unused',
    });
  }

  const created = await EPin.insertMany(pins, { ordered: false });

  return NextResponse.json(
    { success: true, data: created, count: created.length },
    { status: 201 }
  );
}
