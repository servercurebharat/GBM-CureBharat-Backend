import { NextRequest, NextResponse } from 'next/server';
import { POST_VERIFY_OTP } from '../../../lib/controllers/authController';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return POST_VERIFY_OTP(request);
}
