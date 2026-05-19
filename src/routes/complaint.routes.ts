import { Router } from 'express';
import { createComplaint, getUserComplaints, getAllComplaints, updateComplaintStatus, replyToComplaint } from '../controllers/complaint.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

// Secure all routes
router.use(authMiddleware);

// User and Admin routes
router.post('/', createComplaint);
router.get('/my', getUserComplaints);
router.post('/:id/reply', replyToComplaint);

// Admin-only routes
router.get('/all', checkRole(['admin']), getAllComplaints);
router.put('/:id/status', checkRole(['admin']), updateComplaintStatus);

export default router;
