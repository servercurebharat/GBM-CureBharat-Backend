import { Router } from 'express';
import { generateEPins, transferEPin, getMyPins } from '../controllers/epin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

router.post('/generate', authMiddleware, checkRole(['admin']), generateEPins);
router.post('/transfer', authMiddleware, transferEPin);
router.get('/my-pins', authMiddleware, getMyPins);

export default router;
