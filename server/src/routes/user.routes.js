import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
} from '../controllers/user.controller.js';

const router = express.Router();

// All user settings endpoints require authentication
router.use(requireAuth);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.put('/preferences', updatePreferences);

export default router;
