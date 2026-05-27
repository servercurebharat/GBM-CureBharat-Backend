import { Router } from 'express';
import {
  createSubscription,
  subscriptionWebhook,
  getSubscriptionStatus,
} from '../controllers/subscription.controller';

const router = Router();

// Public — no auth needed (customer is not logged in during checkout)
router.post('/create',               createSubscription);
router.post('/webhook',              subscriptionWebhook);
router.get('/status/:subscriptionId', getSubscriptionStatus);

export default router;
