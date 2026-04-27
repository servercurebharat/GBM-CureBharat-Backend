import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '../lib/db';
import User, { IUser, Role } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthenticatedRequest extends NextRequest {
  user?: IUser;
}

export interface JwtPayload {
  userId: string;
  role: Role;
  memberId: string;
}

/**
 * Verify JWT from Authorization header or cookie.
 * Returns the decoded user document from the database.
 *
 * @param request - Incoming Next.js request
 * @returns { user: IUser } or NextResponse 401
 */
export async function verifyAuth(
  request: NextRequest
): Promise<{ user: IUser } | NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('auth_token')?.value;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'No authentication token provided' },
      { status: 401 }
    );
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  await connectDB();
  const user = await User.findById(decoded.userId).lean<IUser>();

  if (!user) {
    return NextResponse.json(
      { success: false, message: 'User not found' },
      { status: 401 }
    );
  }

  if (user.status === 'blocked') {
    return NextResponse.json(
      { success: false, message: 'Account is blocked. Contact support.' },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Check if the authenticated user has one of the required roles.
 * Use after verifyAuth() succeeds.
 *
 * @param user - Authenticated user document
 * @param roles - Array of allowed roles
 * @returns null if authorized, NextResponse 403 if not
 */
export function requireRole(
  user: IUser,
  roles: Role[]
): NextResponse | null {
  if (!roles.includes(user.role)) {
    return NextResponse.json(
      {
        success: false,
        message: `Access denied. Required: [${roles.join(', ')}]. Your role: ${user.role}`,
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Generate a signed JWT token for a user
 */
export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      memberId: user.memberId,
    } as JwtPayload,
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
