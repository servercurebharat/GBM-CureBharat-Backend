import { Router } from 'express';
import { getTeamStats, getTeamList } from '../controllers/team.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authMiddleware, getTeamStats);
router.get('/members', authMiddleware, getTeamList);

export default router;
