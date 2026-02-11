import { useState, useEffect, useRef, useCallback } from 'react';

type WebSpeechRecognition = typeof window extends {
  webkitSpeechRecognition: infer R;
}
  ? R
  : typeof window extends { SpeechRecognition: infer R }
  ? R
  : any;

type SpeechRecognitionInstance = InstanceType<WebSpeechRecognition>;

interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
}

export const useSpeechRecognition = () => {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    isSupported: false,
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef(''); // Stores committed final text

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    const recognition: SpeechRecognitionInstance = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let newFinalSegments = '';

      // The API returns a list of results. resultIndex tells us where the *new* results start.
      // However, for robustness with continuous=true, we can rely on our own accumulation 
      // via resultIndex or just parse new segments.
      // Note: In some browsers, 'event.results' accumulates. In others it might not. 
      // 'resultIndex' is the standard way to know what's new.

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalSegments += transcriptSegment;
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      if (newFinalSegments) {
        finalTranscriptRef.current += newFinalSegments;
      }

      // Update state with (History + Interim)
      // We do NOT add interim to finalTranscriptRef
      setState(prev => ({
        ...prev,
        transcript: finalTranscriptRef.current + interimTranscript,
      }));
    };

    recognition.onerror = (event: any) => {
      // Ignore "no-speech" errors as they are common and benign
      if (event.error === 'no-speech') return;

      setState(prev => ({
        ...prev,
        error: `Speech recognition error: ${event.error}`,
        isListening: false,
      }));
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !state.isListening) {
      // Clear history on new start? default behavior often expects this for a "new turn".
      // But if we want to append, we wouldn't clear. 
      // Given the Modal clears on send, clearing here is safe/expected for a "start".
      // Wait: `resetTranscript` is separate. manual start should probably NOT clear automatically 
      // unless we want fresh context. Let's keep it safe: Don't clear ref unless reset called.
      // Actually, standard usage usually implies start = resume or new. 
      // Let's just start.

      // FIX: If we stopped, finalTranscriptRef has the old text. 
      // The transcript state has old text.
      // If we start again, `recognition` might continue or reset?
      // With `continuous=true`, stopping and starting usually resets the internal recognition session buffer.
      // So `resultIndex` will reset to 0. 
      // If we don't clear `finalTranscriptRef`, we append to it.
      // This is good for "pausing" behavior.

      setState(prev => ({ ...prev, error: null }));
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start recognition", e);
      }
    }
  }, [state.isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setState(prev => ({ ...prev, transcript: '' }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
};