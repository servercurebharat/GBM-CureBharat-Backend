import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { sendEmail } from './src/lib/mailer';

async function testEmail() {
  console.log(`Testing SMTP Configuration:`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`SENDER_EMAIL: ${process.env.SENDER_EMAIL}`);
  console.log(`-----------------------------------`);

  try {
    const info = await sendEmail(
      'harshalsynture@gmail.com',
      'Test Email from CureBharat via Brevo',
      '<div style="font-family:sans-serif; text-align:center;"><h2>Success!</h2><p>Your new Brevo SMTP configuration for <b>communication@curebharat.com</b> is working perfectly!</p></div>'
    );
    console.log('✅ Email sent successfully!');
  } catch (error: any) {
    console.error('❌ Failed to send email.');
    console.error('Error details:', error.message);
  }
}

testEmail();
