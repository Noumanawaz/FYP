import { Request, Response, NextFunction } from 'express';
import { ImageService } from '@/services/image.service';
import { ApiResponse } from '@/types';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 32 * 1024 * 1024, // 32 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const uploadSingle = upload.single('image');
export const uploadMultiple = upload.array('images', 10); // Max 10 images

export class ImageController {
  /**
   * Upload a single image
   */
  static async uploadSingle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        const response: ApiResponse = {
          success: false,
          error: 'No image file provided',
        };
        return res.status(400).json(response);
      }

      // Convert buffer to base64
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Upload to imgBB
      const imageUrl = await ImageService.uploadImage(base64Image, req.file.originalname);

      const response: ApiResponse = {
        success: true,
        data: {
          url: imageUrl,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        message: 'Image uploaded successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload multiple images
   */
  static async uploadMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No image files provided',
        };
        return res.status(400).json(response);
      }

      const files = req.files as Express.Multer.File[];
      
      // Convert buffers to base64
      const base64Images = files.map(file => 
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      );

      // Upload to imgBB
      const imageUrls = await ImageService.uploadMultipleImages(base64Images);

      const response: ApiResponse = {
        success: true,
        data: {
          urls: imageUrls,
          count: imageUrls.length,
        },
        message: `${imageUrls.length} image(s) uploaded successfully`,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload image from base64 string
   */
  static async uploadBase64(req: Request, res: Response, next: NextFunction) {
    try {
      const { image, name } = req.body;

      if (!image) {
        const response: ApiResponse = {
          success: false,
          error: 'No image data provided',
        };
        return res.status(400).json(response);
      }

      // Upload to imgBB
      const imageUrl = await ImageService.uploadImage(image, name);

      const response: ApiResponse = {
        success: true,
        data: {
          url: imageUrl,
        },
        message: 'Image uploaded successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

