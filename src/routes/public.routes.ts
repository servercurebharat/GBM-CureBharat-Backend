import { Router } from 'express';
import {
  getSeller,
  createOrder,
  verifyPayment,
  razorpayWebhook,
} from '../controllers/public.controller';

const router = Router();

// No auth middleware — these are fully public endpoints
router.get('/seller/:memberId', getSeller);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.post('/webhook', razorpayWebhook);

export default router;
