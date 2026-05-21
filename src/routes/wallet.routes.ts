import { Router } from 'express';
import { getMyWallet, requestWithdrawal, getMyWithdrawals, triggerPayoutCycle, getAllProvisional, getAllTransactions, getAllWithdrawalRequests, updateWithdrawalStatus, unfreezeWallet } from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

router.get('/my', authMiddleware, getMyWallet);
router.post('/withdraw', authMiddleware, requestWithdrawal);
router.get('/withdrawals', authMiddleware, getMyWithdrawals);
router.get('/all-provisional', authMiddleware, checkRole(['admin']), getAllProvisional);
router.get('/global-ledger', authMiddleware, checkRole(['admin']), getAllTransactions);
router.post('/payout-cycle', authMiddleware, checkRole(['admin']), triggerPayoutCycle);
router.get('/withdrawal-requests', authMiddleware, checkRole(['admin']), getAllWithdrawalRequests);
router.patch('/withdrawal-requests/:id', authMiddleware, checkRole(['admin']), updateWithdrawalStatus);
router.patch('/:id/unfreeze', authMiddleware, checkRole(['admin']), unfreezeWallet);

export default router;
