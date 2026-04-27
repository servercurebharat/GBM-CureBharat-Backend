/**
 * CureBharat SMS Utility
 * Interface for SMS Gateway integration (e.g. Twilio, MSG91, etc.)
 */

export async function sendSMS(mobile: string, message: string): Promise<boolean> {
  console.log(`[SMS MOCK] To: ${mobile} | Msg: ${message}`);
  
  // In production, use your SMS provider's API:
  // const apiKey = process.env.SMS_API_KEY;
  // const res = await axios.post('https://api.sms-provider.com/send', { ... });
  
  return true;
}

export function generateOTP(): string {
  // Generate a random 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}
