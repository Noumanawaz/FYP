import { AppError } from "@/middleware/error-handler";

interface GroqTranscriptionResponse {
  text: string;
}

export class SpeechService {
  private static readonly GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
  private static readonly GROQ_API_KEY = process.env.GROQ_API_KEY;

  /**
   * Transcribe audio using Groq Whisper API
   * @param audioBuffer - Audio file buffer
   * @param fileName - File name with extension (e.g., 'audio.wav')
   * @param mimeType - MIME type of the audio
   * @returns Transcribed text
   */
  static async transcribeAudio(audioBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    if (!this.GROQ_API_KEY || this.GROQ_API_KEY === 'your_groq_api_key_here') {
      throw new AppError("GROQ_API_KEY is not configured", 500);
    }

    try {
      const formData = new FormData();
      
      // Node.js fetch needs a Blob/File for FormData when using buffers
      const blob = new Blob([audioBuffer], { type: mimeType });
      formData.append("file", blob, fileName);
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "json");

      const response = await fetch(this.GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.GROQ_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Groq API error: ${response.status} ${response.statusText}`, errorText);
        throw new AppError(`Groq API error: ${response.statusText}`, response.status);
      }

      const data = (await response.json()) as GroqTranscriptionResponse;

      if (!data.text) {
        throw new AppError("Failed to get transcription from Groq", 500);
      }

      return data.text;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Transcription failed:", error);
      throw new AppError(`Transcription failed: ${error.message}`, 500);
    }
  }
}
