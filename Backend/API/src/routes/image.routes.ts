import { Router } from 'express';
import { ImageController, uploadSingle, uploadMultiple } from '@/controllers/image.controller';
import { authenticate } from '@/middleware/auth';
import { body } from 'express-validator';
import { validate } from '@/middleware/validation';

const router = Router();

// Upload single image (file upload)
router.post(
  '/upload',
  authenticate,
  uploadSingle,
  ImageController.uploadSingle
);

// Upload multiple images (file upload)
router.post(
  '/upload/multiple',
  authenticate,
  uploadMultiple,
  ImageController.uploadMultiple
);

// Upload image from base64 string
router.post(
  '/upload/base64',
  authenticate,
  [
    body('image').notEmpty().withMessage('Image data is required'),
    body('name').optional().isString(),
  ],
  validate([]),
  ImageController.uploadBase64
);

export default router;

