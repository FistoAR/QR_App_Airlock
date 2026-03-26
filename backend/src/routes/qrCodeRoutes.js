import express from 'express';
import {
  createQRCode,
  getQRCodes,
  getQRCode,
  updateQRCode,
  deleteQRCode,
  downloadQRCode,
  duplicateQRCode,
  deleteManyQRCodes
} from '../controllers/qrCodeController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getQRCodes)
  .post(createQRCode);

router.route('/:id')
  .get(getQRCode)
  .put(updateQRCode)
  .delete(deleteQRCode);

router.get('/:id/download', downloadQRCode);
router.post('/:id/duplicate', duplicateQRCode);
router.post('/bulk-delete', deleteManyQRCodes);

export default router;