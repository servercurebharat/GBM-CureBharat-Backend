import { NextRequest, NextResponse } from 'next/server';
import { POST_REGISTER } from '../../../lib/controllers/authController';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return POST_REGISTER(request);
}
