import { Router } from "express";
import multer from "multer";
import { SpeechController } from "@/controllers/speech.controller";

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  // Optional: Add file size limit or file type filter
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * @swagger
 * /api/v1/speech/transcribe:
 *   post:
 *     summary: Transcribe audio to text
 *     tags: [Speech]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Transcribed text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transcription:
 *                   type: string
 */
router.post("/transcribe", upload.single("file"), SpeechController.transcribe);

export default router;
