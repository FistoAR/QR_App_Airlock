import express from 'express';
import {
  getAnalytics,
  getScanStats,
  getDashboard,
  getScanLocations,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/:qrCodeId/stats', getScanStats);
router.get('/:qrCodeId/locations', getScanLocations);
router.get('/:qrCodeId', getAnalytics);

export default router;