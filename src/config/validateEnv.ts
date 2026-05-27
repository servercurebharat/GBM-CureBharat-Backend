const required = [
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL'
];

export function validateEnv(): void {
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required env variables: ${missing.join(', ')}`);
    // Only exit hard if not on Vercel, to prevent function invocation failures
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }

  // Check Razorpay (Optional but warned)
  const razorpayVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
  const missingRazorpay = razorpayVars.filter(key => !process.env[key]);
  if (missingRazorpay.length > 0) {
    console.warn(`⚠️  Warning: Missing Razorpay configuration: ${missingRazorpay.join(', ')}. Payment features will be disabled.`);
  }

  // Check Cashfree (Optional but warned)
  const cashfreeVars = ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'CASHFREE_RETURN_URL'];
  const missingCashfree = cashfreeVars.filter(key => !process.env[key]);
  if (missingCashfree.length > 0) {
    console.warn(`⚠️  Warning: Missing Cashfree configuration: ${missingCashfree.join(', ')}. Cashfree payments will be disabled.`);
  }

  console.log('✅ Environment variables validated');
}
