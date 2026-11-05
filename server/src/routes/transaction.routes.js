import { Router } from 'express';
import {
  getTransactions,
  getTransactionAnalytics,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transaction.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protect all transaction routes with authentication middleware
router.use(requireAuth);

router.get('/', getTransactions);
router.get('/analytics', getTransactionAnalytics);
router.post('/', createTransaction);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
