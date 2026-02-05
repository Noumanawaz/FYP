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
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setState(prev => ({
          ...prev,
          transcript: prev.transcript + finalTranscript,
        }));
      }
    };

    recognition.onerror = (event: any) => {
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
      setState(prev => ({ ...prev, transcript: '', error: null }));
      recognitionRef.current.start();
    }
  }, [state.isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '' }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
};