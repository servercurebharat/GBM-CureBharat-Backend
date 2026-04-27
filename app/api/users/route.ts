import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/db';
import User from '../../models/User';
import { verifyAuth, requireRole } from '../../lib/authMiddleware';

/**
 * GET /api/users
 * Admin only: List all users with pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth.user, ['admin', 'sh']);
  if (roleCheck) return roleCheck;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { memberId: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
