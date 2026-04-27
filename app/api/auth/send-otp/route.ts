import { NextRequest, NextResponse } from 'next/server';
import { POST_SEND_OTP } from '../../../lib/controllers/authController';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return POST_SEND_OTP(request);
}
