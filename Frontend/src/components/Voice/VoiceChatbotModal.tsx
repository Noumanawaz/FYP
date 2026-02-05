import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Send, RotateCcw, MessageSquare, Settings, Volume2 } from "lucide-react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import ChatbotService, { ChatbotMessage, ChatbotResponse } from "../../services/chatbotService";
import Button from "../Common/Button";
import { speakWithUplift } from "../../services/ttsService";
import { getEnvVar } from "../../utils/env";

interface VoiceChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Get RAG/chatbot base URL from env, fallback to API base URL without /api/v1, or default
const getChatbotBaseUrl = (): string => {
  const ragUrl = getEnvVar('VITE_RAG_BASE_URL', '');
  if (ragUrl) return ragUrl;
  
  // Fallback: try to derive from API base URL (remove /api/v1 if present)
  const apiUrl = getEnvVar('VITE_API_BASE_URL', '');
  if (apiUrl) {
    // Remove /api/v1 suffix if present, or use as-is
    return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  
  // Final fallback
  return 'http://localhost:8000';
};

const VoiceChatbotModal: React.FC<VoiceChatbotModalProps> = ({ isOpen, onClose }) => {
  const { isListening, transcript, isSupported, error, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [apiUrl, setApiUrl] = useState(getChatbotBaseUrl());
  const [showSettings, setShowSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [wsEnabled, setWsEnabled] = useState(true);

  const chatbotService = useRef<ChatbotService>(new ChatbotService(apiUrl));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    if (transcript && !isProcessing) {
      setInputMessage(transcript);
    }
  }, [transcript, isProcessing]);

  useEffect(() => {
    chatbotService.current.setBaseUrl(apiUrl);
  }, [apiUrl]);

  // WebSocket lifecycle
  useEffect(() => {
    if (!isOpen || !wsEnabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const wsUrl = apiUrl.replace("http", "ws") + "/ws/voice";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);
    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload.type === "chat_response" && payload.response) {
          const displayText = payload.response_en || payload.response;
          const speakText = payload.response_ur || displayText;
          console.info("[WS] chat_response", { displayText, hasUrdu: Boolean(payload.response_ur) });
          const botMessage: ChatbotMessage = {
            message: displayText,
            timestamp: new Date().toISOString(),
            isUser: false,
          };
          setMessages((prev) => [...prev, botMessage]);
          if (ttsEnabled) speak(speakText);
        }
      } catch {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [isOpen, apiUrl, wsEnabled, ttsEnabled]);

  // TTS (prefer Uplift, fallback to browser TTS). Auto-pick voice by text script.
  const speak = async (text: string) => {
    try {
      if (isListening) {
        try {
          stopListening();
          console.info("[TTS] stopped listening before playback");
        } catch {}
      }
      const isUrdu = /[\u0600-\u06FF]/.test(text);
      console.info("[TTS] starting", { isUrdu });
      try {
        const urduVoiceId = (import.meta as any).env?.VITE_UPLIFT_VOICE_UR || "v_8eelc901";
        const englishVoiceId = (import.meta as any).env?.VITE_UPLIFT_VOICE_EN || "v_8eelc901";
        await speakWithUplift(text, isUrdu ? urduVoiceId : englishVoiceId);
        console.info("[TTS] Uplift playback queued");
        return;
      } catch (e) {
        console.warn("[TTS] Uplift failed, falling back to browser TTS", e);
      }

      if (!("speechSynthesis" in window)) {
        console.warn("[TTS] speechSynthesis not available in this browser");
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      // Arabic script range indicates Urdu
      const preferred = isUrdu ? voices.find((v) => /^(ur|ar|fa|ps|pa|hi)/i.test(v.lang)) || voices[0] : voices.find((v) => /en-|en_/i.test(v.lang)) || voices[0];
      if (isUrdu) utter.lang = (preferred && preferred.lang) || "ur-PK";
      if (preferred) utter.voice = preferred;
      console.info("[TTS] Browser TTS", { selectedLang: utter.lang, voice: preferred?.name });
      isSpeakingRef.current = true;
      utter.onend = () => {
        isSpeakingRef.current = false;
      };
      try {
        window.speechSynthesis.cancel();
      } catch {}
      try {
        window.speechSynthesis.speak(utter);
        console.info("[TTS] Browser playback queued");
      } catch (e) {
        console.error("Browser TTS speak failed", e);
      }
    } catch {}
  };

  const testConnection = async () => {
    try {
      const response = await fetch(`${apiUrl}/health`);
      setIsConnected(response.ok);
    } catch (error) {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      testConnection();
    }
  }, [isOpen, apiUrl]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: ChatbotMessage = {
      message: inputMessage,
      timestamp: new Date().toISOString(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    resetTranscript();
    setIsProcessing(true);

    try {
      if (wsEnabled && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "chat", message: userMessage.message }));
      } else {
        const response = await chatbotService.current.sendMessage(userMessage.message);
        const displayText = response.response_en || response.response;
        const speakText = response.response_ur || displayText;
        console.info("[HTTP] chat_response", { displayText, hasUrdu: Boolean(response.response_ur) });
        const botMessage: ChatbotMessage = {
          message: displayText,
          timestamp: new Date().toISOString(),
          isUser: false,
        };
        setMessages((prev) => [...prev, botMessage]);
        if (ttsEnabled) speak(speakText);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceMessage = async () => {
    if (!audioBlob || isProcessing) return;

    setIsProcessing(true);

    try {
      const response = await chatbotService.current.sendVoiceData(audioBlob);

      const botMessage: ChatbotMessage = {
        message: response.response,
        timestamp: new Date().toISOString(),
        isUser: false,
      };

      setMessages((prev) => [...prev, botMessage]);
      setAudioBlob(null);
    } catch (error) {
      console.error("Error sending voice message:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
      startListening();
    }
  };

  const handleReset = () => {
    resetTranscript();
    setInputMessage("");
    setMessages([]);
    setAudioBlob(null);
    stopListening();
    chatbotService.current.clearConversationHistory();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  if (!isSupported) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MicOff className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Not Supported</h3>
            <p className="text-gray-600 mb-6">Your browser doesn't support voice recognition. Please use a modern browser like Chrome or Firefox.</p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Vocabite AI Assistant</h3>
                <p className="text-sm text-gray-500">Your personal Pakistani cuisine expert</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm text-gray-500">{isConnected ? "Online" : "Offline"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">API URL:</label>
              <div className="flex space-x-2">
                <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="http://localhost:8000" />
                <Button onClick={testConnection} variant="outline" size="sm">
                  Test
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={ttsEnabled} onChange={(e) => setTtsEnabled(e.target.checked)} />
                  <span>Enable TTS (assistant speaks)</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={wsEnabled} onChange={(e) => setWsEnabled(e.target.checked)} />
                  <span>Enable WebSocket (faster replies)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-8 h-8 text-primary-600" />
              </div>
              <p className="font-medium">Welcome to Vocabite AI!</p>
              <p className="text-sm mt-2">Ask me about Pakistani cuisine, restaurants, or place voice orders.</p>
              <div className="mt-4 text-xs text-gray-400 space-y-1">
                <p>"What's the best biryani near me?"</p>
                <p>"Order chicken karahi for 2 people"</p>
                <p>"Show me halal restaurants"</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.isUser ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-900"}`}>
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-1 ${message.isUser ? "text-primary-100" : "text-gray-500"}`}>{new Date(message.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Voice Recording Status */}
        {isRecording && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-200">
            <div className="flex items-center space-x-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Recording voice message...</span>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            {/* Voice Controls */}
            <div className="flex space-x-2">
              <button onClick={handleToggleListening} disabled={isProcessing || isRecording} className={`p-3 rounded-full transition-all duration-200 ${isListening ? "bg-red-500 hover:bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"} ${isProcessing || isRecording ? "opacity-50 cursor-not-allowed" : ""}`}>
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {audioBlob && (
                <Button onClick={handleVoiceMessage} disabled={isProcessing} leftIcon={<Send className="w-4 h-4" />} size="sm">
                  Send Voice
                </Button>
              )}
            </div>

            {/* Text Input */}
            <div className="flex-1 flex space-x-2">
              <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleSendMessage()} placeholder="Type your message or use voice..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" disabled={isProcessing} />
              <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isProcessing} leftIcon={<Send className="w-4 h-4" />}>
                Send
              </Button>
            </div>

            <Button variant="outline" onClick={handleReset} leftIcon={<RotateCcw className="w-4 h-4" />} size="sm">
              Reset
            </Button>
          </div>

          {/* Status Messages */}
          <div className="mt-3 space-y-1">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {isListening && <p className="text-sm text-blue-600">Listening... Speak now</p>}
            {transcript && <p className="text-sm text-gray-600">Transcribed: "{transcript}"</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatbotModal;
