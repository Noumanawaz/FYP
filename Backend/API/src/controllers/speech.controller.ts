import { Request, Response, NextFunction } from "express";
import { SpeechService } from "@/services/speech.service";
import { AppError } from "@/middleware/error-handler";

export class SpeechController {
  
  /**
   * Transcribe POST /api/v1/speech/transcribe
   */
  static async transcribe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError("No audio file found in request", 400);
      }

      const audioBuffer = req.file.buffer;
      const originalName = req.file.originalname || "recording.webm";
      const mimeType = req.file.mimetype || "audio/webm";

      if (audioBuffer.length === 0) {
        throw new AppError("Audio file is empty", 400);
      }

      const transcription = await SpeechService.transcribeAudio(audioBuffer, originalName, mimeType);

      return res.status(200).json({
        success: true,
        transcription: transcription,
        language: "auto", // Whisper automatically detects English, Urdu, Roman Urdu
      });
    } catch (error) {
      console.error("[SpeechController.transcribe] Error:", error);
      return next(error);
    }
  }
}
