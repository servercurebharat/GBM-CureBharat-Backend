import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import User from '../../../../models/User';
import { verifyAuth } from '../../../../lib/authMiddleware';

interface RouteParams {
  params: { id: string };
}

interface DownlineNode {
  _id: string;
  name: string;
  memberId: string;
  role: string;
  rank: string;
  status: string;
  personalSalesCount: number;
  teamSize: number;
  children: DownlineNode[];
}

/**
 * Recursively build downline tree (BFS to avoid stack overflow)
 */
async function buildDownlineTree(rootId: string, depth = 0, maxDepth = 5): Promise<DownlineNode[]> {
  if (depth >= maxDepth) return [];

  const children = await User.find({ referrerId: rootId })
    .select('_id name memberId role rank status personalSalesCount teamSize')
    .lean();

  const nodes: DownlineNode[] = [];
  for (const child of children) {
    const childChildren = await buildDownlineTree(child._id.toString(), depth + 1, maxDepth);
    nodes.push({
      _id: child._id.toString(),
      name: child.name,
      memberId: child.memberId,
      role: child.role,
      rank: child.rank,
      status: child.status,
      personalSalesCount: child.personalSalesCount,
      teamSize: child.teamSize,
      children: childChildren,
    });
  }

  return nodes;
}

/**
 * GET /api/users/[id]/downline
 * Get full downline tree (max 5 levels deep)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const maxDepth = Math.min(parseInt(searchParams.get('depth') || '5'), 5);

  const tree = await buildDownlineTree(params.id, 0, maxDepth);

  return NextResponse.json({
    success: true,
    data: tree,
    rootId: params.id,
  });
}
