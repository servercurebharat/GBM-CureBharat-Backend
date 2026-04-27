import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/db';
import Sale from '../../models/Sale';
import Plan from '../../models/Plan';
import { verifyAuth } from '../../lib/authMiddleware';
import { processCommission } from '../../lib/commission';
import { checkAndPromote } from '../../lib/rankEngine';

/**
 * POST /api/sales
 * Create a new sale (HCC only) — triggers commission cascade
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!['hcc', 'admin'].includes(auth.user.role)) {
    return NextResponse.json({ success: false, message: 'Only HCC can create sales' }, { status: 403 });
  }

  const body = await request.json();
  const { customerName, customerMobile, planId, ePinCode } = body;

  if (!customerName || !customerMobile || !planId) {
    return NextResponse.json(
      { success: false, message: 'customerName, customerMobile, and planId are required' },
      { status: 400 }
    );
  }

  await connectDB();

  const plan = await Plan.findById(planId).lean();
  if (!plan || !plan.isActive) {
    return NextResponse.json({ success: false, message: 'Plan not found or inactive' }, { status: 404 });
  }

  // Generate unique policyId
  const timestamp = Date.now().toString(36).toUpperCase();
  const policyId = `CB-POL-${timestamp}`;
  const cycleMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const sale = await Sale.create({
    policyId,
    hccId: auth.user._id,
    customerId: `CUST-${Date.now()}`,
    customerName,
    customerMobile,
    planId,
    saleAmount: plan.price,
    commissionableAmount: plan.isCommissionable ? plan.businessVolume : 0,
    status: 'confirmed',
    cycleMonth,
    saleDate: new Date(),
  });

  // Process commission cascade (sequential — never parallel)
  if (plan.isCommissionable) {
    await processCommission(sale._id.toString());
  }

  // Check for rank promotions
  await checkAndPromote(auth.user._id.toString());

  return NextResponse.json(
    { success: true, data: sale, message: 'Sale created and commission processed' },
    { status: 201 }
  );
}

/**
 * GET /api/sales
 * Get sales filtered by role
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const cycleMonth = searchParams.get('cycleMonth');

  const filter: Record<string, unknown> = {};

  // HCC only sees their own sales
  if (auth.user.role === 'hcc') {
    filter.hccId = auth.user._id;
  }

  if (cycleMonth) filter.cycleMonth = cycleMonth;

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate('planId', 'name price')
      .populate('hccId', 'name memberId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Sale.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: sales,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
