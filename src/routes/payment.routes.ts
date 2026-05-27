import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getMyPayments,
  getAllPayments,
} from '../controllers/payment.controller';

const router = Router();

// ─── Public (NO auth) ─────────────────────────────────────────────────────────
// Cashfree calls this endpoint server-to-server — must NOT be behind auth
router.post('/webhook', handleWebhook);

// ─── Protected (User) ─────────────────────────────────────────────────────────
router.post('/create-order', authMiddleware, createOrder);
router.get('/verify/:orderId',  authMiddleware, verifyPayment);
router.get('/history',          authMiddleware, getMyPayments);

// ─── Protected (Admin) ────────────────────────────────────────────────────────
router.get('/all', authMiddleware, checkRole(['admin']), getAllPayments);

export default router;
