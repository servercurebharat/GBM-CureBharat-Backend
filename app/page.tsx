import { NextResponse } from 'next/server';

export default function Home() {
  return NextResponse.json({
    name: 'CureBharat MLM API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'POST /api/auth/send-otp',
      'POST /api/auth/verify-otp',
      'POST /api/auth/register',
      'GET  /api/auth/me',
      'GET  /api/users',
      'GET  /api/users/:id',
      'GET  /api/users/:id/downline',
      'POST /api/sales',
      'GET  /api/sales',
      'GET  /api/wallet/:userId',
      'POST /api/wallet/withdraw',
      'POST /api/wallet/payout-cycle',
      'POST /api/epins/generate',
      'POST /api/epins/transfer',
      'POST /api/epins/burn',
      'GET  /api/epins/my-pins',
    ],
  });
}
