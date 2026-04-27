import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '../../../lib/db';
import User from '../../../models/User';
import { generateToken } from '../../../lib/authMiddleware';

/** In-memory OTP store — replace with Redis in production */
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

/**
 * POST /api/auth/send-otp
 * Send OTP to mobile number
 */
export async function POST_SEND_OTP(request: NextRequest): Promise<NextResponse> {
  const { mobile } = await request.json();
  if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
    return NextResponse.json(
      { success: false, message: 'Invalid mobile number' },
      { status: 400 }
    );
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(mobile, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min

  // TODO: Send via SMS gateway
  // await sendSMS(mobile, `Your CureBharat OTP is: ${otp}. Valid for 5 minutes.`);
  console.log(`OTP for ${mobile}: ${otp}`); // DEV ONLY — remove in production

  return NextResponse.json({ success: true, message: 'OTP sent successfully' });
}

/**
 * POST /api/auth/verify-otp
 * Verify OTP and return JWT
 */
export async function POST_VERIFY_OTP(request: NextRequest): Promise<NextResponse> {
  const { mobile, otp } = await request.json();

  const record = otpStore.get(mobile);
  if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
    return NextResponse.json(
      { success: false, message: 'Invalid or expired OTP' },
      { status: 400 }
    );
  }

  otpStore.delete(mobile);

  await connectDB();
  const user = await User.findOne({ mobile }).lean();
  if (!user) {
    // OTP verified but user not registered — return a temp verification token
    return NextResponse.json({
      success: true,
      verified: true,
      registered: false,
      message: 'OTP verified. Please complete registration.',
    });
  }

  const token = generateToken(user as any);
  const response = NextResponse.json({
    success: true,
    verified: true,
    registered: true,
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      rank: user.rank,
      memberId: user.memberId,
    },
  });

  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}

/**
 * POST /api/auth/register
 * Register a new member
 */
export async function POST_REGISTER(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { name, mobile, email, password, referrerId, state, ePinCode } = body;

  if (!name || !mobile || !password) {
    return NextResponse.json(
      { success: false, message: 'Name, mobile, and password are required' },
      { status: 400 }
    );
  }

  await connectDB();

  const exists = await User.findOne({ mobile }).lean();
  if (exists) {
    return NextResponse.json(
      { success: false, message: 'Mobile number already registered' },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  // Generate memberId: CB-HCC-XXXX
  const count = await User.countDocuments({ role: 'hcc' });
  const memberId = `CB-HCC-${String(count + 1).padStart(4, '0')}`;

  const user = await User.create({
    name,
    mobile,
    email,
    password: hashed,
    role: 'hcc',
    rank: 'HCC',
    memberId,
    referrerId: referrerId || undefined,
    state,
    joiningDate: new Date(),
  });

  // TODO: If ePinCode provided, burn the pin via epin service

  const token = generateToken(user as any);
  const response = NextResponse.json(
    {
      success: true,
      message: 'Registration successful',
      user: { id: user._id, memberId, role: 'hcc', rank: 'HCC' },
    },
    { status: 201 }
  );

  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
