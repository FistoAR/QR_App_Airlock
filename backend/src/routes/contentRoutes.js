import express from 'express';
import {
  uploadFile,
  updateContent,
  getContent,
  deleteFile
} from '../controllers/contentController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/upload', upload.single('file'), uploadFile);
router.delete('/file', deleteFile);

router.route('/:qrCodeId')
  .get(getContent)
  .put(updateContent);

export default router;