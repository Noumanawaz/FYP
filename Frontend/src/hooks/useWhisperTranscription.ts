import { useState, useRef, useCallback, useEffect } from "react";

interface WhisperTranscriptionState {
  isListening: boolean;
  transcript: string;
  isTranscribing: boolean;
  error: string | null;
}

export const useWhisperTranscription = (silenceThreshold = -38, silenceDuration = 1500) => {
  const [state, setState] = useState<WhisperTranscriptionState>({
    isListening: false,
    transcript: "",
    isTranscribing: false,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

  const transcribeAudio = async (audioBlob: Blob) => {
    if (audioBlob.size < 2000) return;

    setState((prev) => ({ ...prev, isTranscribing: true }));
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const response = await fetch(`${API_URL}/speech/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Transcription failed: ${response.statusText}`);

      const data = await response.json();
      if (data.transcription) {
        setState((prev) => ({
          ...prev,
          transcript: data.transcription,
          isTranscribing: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isTranscribing: false }));
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setState((prev) => ({ ...prev, isTranscribing: false, error: err.message }));
    }
  };

  const stopListening = useCallback((shouldTranscribe = true) => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    // Stop silence monitor
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // If we don't want to transcribe, remove the onstop handler before stopping
      if (!shouldTranscribe) {
        mediaRecorderRef.current.onstop = null;
      }
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop Audio Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close Audio Context
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
      audioContextRef.current = null;
    }

    setState((prev) => ({ ...prev, isListening: false }));
    isStoppingRef.current = false;
  }, []);

  const monitorSilence = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength);
    const db = 20 * Math.log10(rms || 0.000001);

    if (db < silenceThreshold) {
      if (silenceStartRef.current === null) {
        silenceStartRef.current = Date.now();
      } else if (Date.now() - silenceStartRef.current > silenceDuration) {
        console.log("[WhisperHook] Audio silence detected, stopping...");
        stopListening(true);
        return;
      }
    } else {
      silenceStartRef.current = null;
    }

    animationFrameRef.current = requestAnimationFrame(monitorSilence);
  }, [silenceThreshold, silenceDuration, stopListening]);

  const startListening = useCallback(async () => {
    // Cleanly stop any existing session WITHOUT transcribing it
    stopListening(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      silenceStartRef.current = null;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        transcribeAudio(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      setState({
        isListening: true,
        transcript: "",
        isTranscribing: false,
        error: null,
      });

      monitorSilence();

    } catch (err: any) {
      console.error("Failed to start recording:", err);
      setState((prev) => ({ ...prev, error: "Microphone error: " + err.message }));
    }
  }, [monitorSilence, stopListening]);

  const resetTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: "", error: null }));
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup cleanup
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
};
