import { Router } from 'express';
import {
  getSeller,
  createOrder,
  verifyPayment,
  razorpayWebhook,
  checkMobile,
  sendEmailOTP,
  verifyEmailOTP,
} from '../controllers/public.controller';

const router = Router();

// No auth middleware — these are fully public endpoints
router.get('/seller/:memberId',    getSeller);
router.post('/create-order',       createOrder);
router.post('/verify-payment',     verifyPayment);
router.post('/webhook',            razorpayWebhook);

// Enrollment form helpers
router.get('/check-mobile/:mobile', checkMobile);
router.post('/send-otp',           sendEmailOTP);
router.post('/verify-otp',         verifyEmailOTP);

export default router;
