import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyActivityCheck } from '../../../lib/activityCheck';

/**
 * GET /api/cron/activity-check
 * Vercel Cron Job — runs on 1st of every month at midnight
 * Configure in vercel.json: { "crons": [{ "path": "/api/cron/activity-check", "schedule": "0 0 1 * *" }] }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const result = await runMonthlyActivityCheck();

  return NextResponse.json({
    success: true,
    message: 'Monthly activity check complete',
    data: result,
  });
}
