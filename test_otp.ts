import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { sendOTPMail } from './src/lib/mailer';

async function testOTP() {
  console.log(`Testing sendOTPMail`);
  try {
    const sent = await sendOTPMail('harshalsynture@gmail.com', '123456');
    console.log('OTP sent:', sent);
  } catch (error: any) {
    console.error('Error details:', error.message);
  }
}

testOTP();
