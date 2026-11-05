import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { chatWithFinancialAssistant } from '../controllers/ai.controller.js';

const router = express.Router();

// All AI assistant endpoints require authentication
router.use(requireAuth);

// POST /api/ai/chat
router.post('/chat', chatWithFinancialAssistant);

export default router;
