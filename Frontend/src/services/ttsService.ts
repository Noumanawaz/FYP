// Use getEnvVar helper to support both Vite and Jest environments
import { getEnvVar } from '../utils/env';

export interface UpliftTTSResult {
  duration?: number;
}

// Track active audio so we can stop it if needed
let activeAudio: HTMLAudioElement | null = null;
let activeObjectURL: string | null = null;

export function stopUpliftTTS() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch (e) {
      console.error("Error stopping Uplift TTS:", e);
    }
    activeAudio = null;
  }
  if (activeObjectURL) {
    try {
      URL.revokeObjectURL(activeObjectURL);
    } catch (e) { }
    activeObjectURL = null;
  }
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

  // Stop any existing playback before starting new one
  stopUpliftTTS();

  const audioBlob = await response.blob();

  // Play the audio
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  activeAudio = audio;
  activeObjectURL = audioUrl;

  // Clean up the object URL after playback ends
  return new Promise((resolve, reject) => {
    // Clean up the object URL after playback ends
    audio.addEventListener('ended', () => {
      if (activeObjectURL === audioUrl) stopUpliftTTS();
      resolve({ duration: audioDuration });
    }, { once: true });

    audio.addEventListener('error', (e) => {
      if (activeObjectURL === audioUrl) stopUpliftTTS();
      reject(e);
    });

    audio.play().catch((err) => {
      // Clean up on play error
      if (activeObjectURL === audioUrl) stopUpliftTTS();
      reject(err);
    });
  });
}
