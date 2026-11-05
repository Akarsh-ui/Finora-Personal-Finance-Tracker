import { Router } from 'express';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../controllers/budget.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Require authentication for all budget operations
router.use(requireAuth);

router.get('/', getBudgets);
router.post('/', createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
