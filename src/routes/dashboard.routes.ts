import { Router } from 'express';
import { getDashboardSummary, getTopLeaders } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/summary', getDashboardSummary);
router.get('/leaders', getTopLeaders);

export default router;
