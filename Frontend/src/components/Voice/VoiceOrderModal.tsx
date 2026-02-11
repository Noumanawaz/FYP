import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Bot } from "lucide-react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { VoiceOrderProcessor, ParsedOrder } from "../../utils/voiceOrderProcessor";
import OrderConfirmationModal from "./OrderConfirmationModal";
import Button from "../Common/Button";
import ChatbotService from "../../services/chatbotService";
import { speakWithUplift } from "../../services/ttsService";
import { getEnvVar } from "../../utils/env";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface VoiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSubmit: (orderText: string) => void;
}

// Get RAG/chatbot base URL from env, fallback to API base URL without /api/v1, or default
// Get RAG/chatbot base URL from env - helper kept if needed for future, or remove if strictly unused. 
// Lint says unused, so removing it to be clean.


const VoiceOrderModal: React.FC<VoiceOrderModalProps> = ({ isOpen, onClose, onOrderSubmit }) => {
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const inputRef = useRef<HTMLInputElement>(null); // Unused
  const chatbotServiceRef = useRef<ChatbotService>(new ChatbotService());
  const isSpeakingRef = useRef<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get voices, waiting for them to load if necessary
  const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      // Wait for voices to load
      const onVoicesChanged = () => {
        const loadedVoices = window.speechSynthesis.getVoices();
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(loadedVoices);
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      // Fallback timeout in case voices never load
      setTimeout(() => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(window.speechSynthesis.getVoices());
      }, 1000);
    });
  };

  // TTS helper (prefer Uplift; fallback to browser speechSynthesis). Show EN, speak UR.
  // TTS helper (prefer Uplift; fallback to browser TTS). Auto-pick voice by text script.
  const speak = async (text: string, onComplete?: () => void) => {
    try {
      if (isListening) {
        try {
          stopListening();
          console.info("[OrderModal][TTS] stopped listening before playback");
        } catch { }
      }

      // Check if text has Urdu logical characters (Arabic script)
      const isUrduScript = /[\u0600-\u06FF]/.test(text);
      console.info("[OrderModal][TTS] starting", { textPreview: text.substring(0, 20), isUrduScript });

      // Check if Uplift API key is available before attempting to use it
      // Note: Values from import.meta.env are statically replaced at build time, 
      // but getEnvVar helps with runtime/testing fallback.
      const upliftApiKey = (import.meta as any).env?.VITE_UPLIFT_API_KEY || getEnvVar('VITE_UPLIFT_API_KEY', '');

      console.info("[OrderModal][TTS] Uplift API key check", {
        hasKey: !!upliftApiKey,
        keyLength: upliftApiKey?.length || 0,
        keyPrefix: upliftApiKey?.substring(0, 7) || 'none',
        fromMeta: !!(import.meta as any).env?.VITE_UPLIFT_API_KEY,
        fromGetEnv: !!getEnvVar('VITE_UPLIFT_API_KEY', '')
      });

      if (upliftApiKey) {
        try {
          const urduVoiceId = getEnvVar('VITE_UPLIFT_VOICE_UR', 'v_8eelc901');
          const englishVoiceId = getEnvVar('VITE_UPLIFT_VOICE_EN', 'v_8eelc901');
          setIsSpeaking(true);
          await speakWithUplift(text, isUrduScript ? urduVoiceId : englishVoiceId, upliftApiKey);
          setIsSpeaking(false);
          console.info("[OrderModal][TTS] Uplift playback queued");
          if (onComplete) onComplete();
          return;
        } catch (e) {
          console.warn("[OrderModal][TTS] Uplift failed, falling back to browser TTS", e);
        }
      } else {
        console.info("[OrderModal][TTS] Uplift API key not configured, using browser TTS");
      }

      if (!("speechSynthesis" in window)) {
        console.warn("[OrderModal][TTS] speechSynthesis not available");
        if (onComplete) onComplete();
        return;
      }

      // Cancel any current speech
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = 1.0;

      const voices = await getVoices();
      let selectedVoice = null;

      if (isUrduScript) {
        // Try to find Urdu or Arabic voice
        selectedVoice = voices.find(v => v.lang.includes('ur') || v.lang.includes('ar'));
      }

      // If no Urdu voice or not Urdu script, try to find a natural sounding English voice or fallback
      if (!selectedVoice) {
        // Google voices often sound better
        selectedVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("en")) ||
          voices.find(v => v.lang.includes("en-US")) ||
          voices[0];
      }

      if (selectedVoice) {
        utter.voice = selectedVoice;
        utter.lang = selectedVoice.lang;
      }

      console.info("[OrderModal][TTS] Browser TTS", {
        selectedLang: utter.lang,
        voice: selectedVoice?.name || "default",
        voiceCount: voices.length
      });

      isSpeakingRef.current = true;
      setIsSpeaking(true);
      utter.onend = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        console.log("[OrderModal][TTS] playback ended");
        if (onComplete) onComplete();
      };

      utter.onerror = (e) => {
        console.error("[OrderModal][TTS] playback error", e);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        if (onComplete) onComplete();
      };

      try {
        window.speechSynthesis.speak(utter);
        console.info("[OrderModal][TTS] Browser playback queued");
      } catch (e) {
        console.error("[OrderModal][TTS] Browser speak failed", e);
        if (onComplete) onComplete();
      }
    } catch (e) {
      console.error("[OrderModal][TTS] Speak error", e);
      if (onComplete) onComplete();
    }
  };

  // Initialize with simpler welcome message but DO NOT auto-start listening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeText = "Hi there! I'm listening. What are you in the mood for?";
      const welcomeMessage: Message = {
        id: "1",
        type: "bot",
        content: welcomeText,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      // Do not speak or listen automatically on mount
    }
  }, [isOpen]);

  // Handle manual start of the call
  const handleStartCall = () => {
    setHasStarted(true);
    const welcomeText = messages[0]?.content || "Hi there! I'm listening. What are you in the mood for?";

    // Speak welcome message, then start listening
    speak(welcomeText, () => {
      if (!isListening && !isProcessing) {
        startListening();
      }
    });
  };

  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Backend integration replaces local stubbed responses

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    resetTranscript(); // Clear transcript after sending
    setIsProcessing(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: "typing",
      type: "bot",
      content: "Typing...",
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      // Send transcribed text to backend
      const resp = await chatbotServiceRef.current.sendMessage(userMessage.content);

      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => msg.id !== "typing"));

      const displayText = (resp as any).response_en || resp.response;
      const speakText = (resp as any).response_ur || displayText;
      console.info("[OrderModal][HTTP] chat_response", { displayText, hasUrdu: Boolean((resp as any).response_ur) });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: displayText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      // Speak Urdu if available; else English
      speak(speakText, () => {
        // Auto-resume listening after AI finishes speaking, if call is still active
        // Add a small delay to prevent the mic from picking up the very end of the AI's speech (echo)
        if (isOpen && !isProcessing) {
          setTimeout(() => {
            startListening();
          }, 500); // 500ms safety buffer
        }
      });

      // If backend implies an order, try parsing for confirmation modal
      const parsed = VoiceOrderProcessor.parseOrder(userMessage.content);
      if (parsed.items.length > 0) {
        setParsedOrder(parsed);
      }
    } catch (e) {
      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => msg.id !== "typing"));
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "bot",
        content: "Sorry, I could not reach the assistant. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = () => {
    if (parsedOrder) {
      // Generate a comprehensive order summary
      const confirmationMessage = VoiceOrderProcessor.generateConfirmationMessage(parsedOrder);
      const suggestionMessage = VoiceOrderProcessor.generateSuggestionMessage(parsedOrder.suggestions);

      onOrderSubmit(confirmationMessage + suggestionMessage);

      // Reset state
      setInputText("");
      setParsedOrder(null);
      setShowConfirmation(false);
      resetTranscript();
      onClose();
    }
  };

  const handleEditOrder = () => {
    setShowConfirmation(false);
    // Keep the current order text for editing
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleReset = () => {
    resetTranscript();
    setInputText("");
    setParsedOrder(null);
    setShowConfirmation(false);
    setMessages([]);
    stopListening();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Silence Detection Logic
  useEffect(() => {
    // Only run if listening and we have some text
    if (isListening && transcript.length > 0) {
      // Clear existing timer on every transcript change (debounce)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Set new timer for 1.5s
      silenceTimerRef.current = setTimeout(() => {
        console.log("[VoiceOrderModal] Silence detected (1.5s), stopping listening to auto-send...");
        stopListening();
        // The existing useEffect for (!isListening && transcript) will handle the specific sendMessage call
      }, 1500);
    } else {
      // Cleanup if not listening or empty
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [transcript, isListening, stopListening]);

  // Auto-send when listening stops and we have a transcript
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0 && !isProcessing && !isSpeaking) {
      handleSendMessage();
    }
  }, [isListening, transcript, isProcessing, isSpeaking]);

  // handleKeyPress removed as text input is hidden/removed

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
    <>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white overflow-hidden font-sans">
        {/* Premium Futuristic Background */}
        <div className="absolute inset-0 z-0">
          {/* Deep Space Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a] z-0"></div>

          {/* Aurora Effect */}
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>

          {/* Grid overlay for tech feel */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay"></div>
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center justify-between h-full py-16 px-6">

          {/* Minimal Header */}
          <div className="w-full flex justify-between items-center opacity-70">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-300" />
              <span className="text-xs font-medium tracking-widest text-cyan-100/80 uppercase">VOCABITE AI</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-white/80">
                  {isListening ? "LISTENING" : isProcessing ? "THINKING" : isSpeaking ? "SPEAKING" : "IDLE"}
                </span>
              </div>

              <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
          </div>

          {/* Central Intelligence Visualizer */}
          <div className="flex-1 flex flex-col items-center justify-center w-full relative">

            {!hasStarted ? (
              /* Initial Start State */
              <div className="flex flex-col items-center animate-fade-in-up">
                <button
                  onClick={handleStartCall}
                  className="group relative w-32 h-32 flex items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-400/30 hover:bg-cyan-500/20 transition-all duration-500 hover:scale-110 hover:shadow-[0_0_50px_rgba(34,211,238,0.3)]"
                >
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-cyan-400 duration-3000"></div>
                  <Mic className="w-10 h-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                </button>
                <p className="mt-8 text-cyan-200/60 font-light tracking-widest text-sm uppercase">Tap to Connect</p>
              </div>
            ) : (
              /* Active Call State */
              <>
                {/* Status Indicator (Prominent) */}
                <div className="absolute top-10 flex flex-col items-center gap-2 animate-fade-in-up">
                  <span className={`text-sm font-bold tracking-[0.2em] uppercase transition-colors duration-500 ${isListening ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" :
                    isProcessing ? "text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]" :
                      isSpeaking ? "text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" :
                        "text-slate-400"
                    }`}>
                    {isListening ? "Listening..." : isProcessing ? "Thinking..." : isSpeaking ? "Speaking..." : "Standby"}
                  </span>
                </div>

                {/* The "Brain" Orb */}
                <div className="relative w-72 h-72 flex items-center justify-center mb-8 mt-4">
                  {/* Rotating Rings */}
                  <div className={`absolute inset-0 border border-cyan-500/10 rounded-full box-border transition-all duration-1000 ${isListening ? 'scale-110 opacity-40 animate-[spin_10s_linear_infinite]' : 'scale-100 opacity-20'}`}></div>
                  <div className={`absolute inset-6 border border-purple-500/10 rounded-full box-border transition-all duration-1000 delay-100 ${isProcessing ? 'scale-105 opacity-50 animate-[spin_5s_linear_infinite_reverse]' : 'scale-100 opacity-20'}`}></div>

                  {/* Core Glow */}
                  <div className={`
                                w-48 h-48 rounded-full blur-2xl transition-all duration-700
                                ${isListening ? 'bg-cyan-500/30' : ''}
                                ${isProcessing ? 'bg-purple-500/40' : ''}
                                ${isSpeaking ? 'bg-green-500/30' : ''}
                                ${!isListening && !isProcessing && !isSpeaking ? 'bg-slate-500/10' : ''}
                            `}></div>

                  {/* Central Element */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    {isSpeaking ? (
                      <div className="flex items-center gap-2 h-16">
                        {[1, 2, 3, 2, 1].map((scale, i) => (
                          <div key={i} className="w-2 bg-green-400 rounded-full animate-wave shadow-[0_0_15px_rgba(74,222,128,0.5)]" style={{ height: `${scale * 10}px`, animationDelay: `${i * 0.1}s` }}></div>
                        ))}
                      </div>
                    ) : isProcessing ? (
                      <div className="w-16 h-16 border-4 border-t-purple-400 border-r-purple-400/30 border-b-purple-400/10 border-l-purple-400/60 rounded-full animate-spin shadow-[0_0_20px_rgba(192,132,252,0.4)]"></div>
                    ) : (
                      <div className={`w-40 h-40 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-sm transition-all duration-500 ${isListening ? 'bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.2)] scale-110' : 'bg-white/5'}`}>
                        <Mic className={`w-10 h-10 transition-colors duration-300 ${isListening ? 'text-cyan-400' : 'text-white/20'}`} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Subtitles */}
                <div className="w-full max-w-xl text-center min-h-[160px] flex flex-col justify-end pb-8 relative z-20">
                  {/* User Transcript */}
                  {transcript && (
                    <h2 className="text-3xl md:text-4xl font-light text-white leading-tight animate-fade-in-up tracking-tight">
                      "{transcript}"
                    </h2>
                  )}

                  {/* Bot Response */}
                  {!transcript && messages.length > 0 && (
                    <h2 className="text-2xl md:text-3xl font-light text-cyan-50 leading-relaxed animate-fade-in-up tracking-tight drop-shadow-[0_0_15px_rgba(165,243,252,0.3)]">
                      {messages[messages.length - 1].content}
                    </h2>
                  )}

                  {/* Hint Loop */}
                  {!transcript && messages.length <= 1 && !isSpeaking && (
                    <p className="mt-6 text-sm text-cyan-200/40 font-light tracking-wide uppercase animate-pulse">
                      Try saying "I'm craving Biryani"
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom Controls (Minimal) */}
          <div className="flex gap-6 items-center z-20">
            {hasStarted && (
              <button
                onClick={handleToggleListening}
                className={`
                            w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md border hover:scale-105 active:scale-95
                            ${isListening
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]'}
                        `}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={handleClose}
              className="w-14 h-14 rounded-full bg-white/5 text-white/50 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-105"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Styles for this component's animations */}
        <style>{`
            @keyframes wave {
                0%, 100% { height: 10px; }
                50% { height: 30px; }
            }
            .animate-fade-in-up {
                animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        `}</style>
      </div >

      {/* Order Confirmation Modal - Kept as before */}
      {parsedOrder && <OrderConfirmationModal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={handleConfirmOrder} onEdit={handleEditOrder} parsedOrder={parsedOrder} confirmationMessage={VoiceOrderProcessor.generateConfirmationMessage(parsedOrder)} />}
    </>
  );
};

export default VoiceOrderModal;
