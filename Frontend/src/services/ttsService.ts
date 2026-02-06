// Use getEnvVar helper to support both Vite and Jest environments
import { getEnvVar } from '../utils/env';

export interface UpliftTTSResult {
  duration?: number;
}

/**
 * Convert text to speech using Uplift AI API
 * @param text - The text to convert to speech
 * @param voiceId - The voice ID to use (default: v_8eelc901)
 * @returns Promise that resolves when audio playback starts
 */
export async function speakWithUplift(
  text: string,
  voiceId: string = "v_8eelc901",
  apiKey?: string
): Promise<UpliftTTSResult> {
  const keyToUse = apiKey || getEnvVar('VITE_UPLIFT_API_KEY', '');

  if (!keyToUse) {
    throw new Error("Uplift AI API key missing. Set VITE_UPLIFT_API_KEY in your env.");
  }

  const response = await fetch('https://api.upliftai.org/v1/synthesis/text-to-speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keyToUse}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      voiceId,
      text,
      outputFormat: 'MP3_22050_128'
    })
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(`Uplift TTS failed: ${response.status} ${msg}`);
  }

  // Extract audio duration from response headers (if available)
  const audioDurationHeader = response.headers.get('x-uplift-ai-audio-duration');
  const audioDuration = audioDurationHeader ? parseFloat(audioDurationHeader) : undefined;

  const audioBlob = await response.blob();

  // Play the audio
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  // Clean up the object URL after playback ends
  audio.addEventListener('ended', () => {
    URL.revokeObjectURL(audioUrl);
  }, { once: true });

  await audio.play().catch(() => {
    // Clean up on play error
    URL.revokeObjectURL(audioUrl);
    // Swallow play errors due to user gesture restrictions; caller can decide fallback
  });

  return { duration: audioDuration };
}
