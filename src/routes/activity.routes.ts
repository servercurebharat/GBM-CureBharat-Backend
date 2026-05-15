import { Router } from 'express';
import { getActivityLogs } from '../controllers/activity.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

// Only admin and super heads can view system-wide activity logs
router.get('/', authMiddleware, checkRole(['admin', 'sh']), getActivityLogs);

export default router;
