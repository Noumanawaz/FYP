import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Bot } from "lucide-react";
import { useWhisperTranscription } from "../../hooks/useWhisperTranscription";
import { VoiceOrderProcessor, ParsedOrder } from "../../utils/voiceOrderProcessor";
import OrderConfirmationModal from "./OrderConfirmationModal";
import Button from "../Common/Button";
import ChatbotService from "../../services/chatbotService";
import { speakWithUplift, stopUpliftTTS } from "../../services/ttsService";
import { getEnvVar } from "../../utils/env";
import { useApp } from "../../contexts/AppContext";

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
  const { isListening, transcript, isTranscribing, error, startListening, stopListening, resetTranscript } = useWhisperTranscription();

  const isSupported = true; // MediaRecorder is widely supported

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
  }, [messages, transcript]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  // Backend integration replaces local stubbed responses

  const { state } = useApp();
  const currentUser = state.user;

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputText.trim();
    if (!textToSend || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: textToSend,
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
      console.info("[OrderModal] Sending message to chatbot API...", textToSend, { userId: currentUser?.id });
      // Send transcribed text to backend with user ID
      const resp = await chatbotServiceRef.current.sendMessage(textToSend, currentUser?.id);
      console.info("[OrderModal] Received response from chatbot API:", resp);

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
        if (isOpen && !isProcessing) {
          setTimeout(() => {
            startListening();
          }, 500); // 500ms safety buffer
        }
      });

      // If backend implies an order, try parsing for confirmation modal
      const parsed = VoiceOrderProcessor.parseOrder(textToSend);
      if (parsed.items.length > 0) {
        setParsedOrder(parsed);
      }
    } catch (e) {
      console.error("[OrderModal] Chat API error:", e);
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

    // Stop all forms of TTS
    stopUpliftTTS();
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) { }
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Silence detection is now handled natively by our useWhisperTranscription hook.
  // The hook automatically calls stopListening() when silence is detected.

  // Auto-send when listening stops and we have a transcript
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0 && !isProcessing && !isSpeaking) {
      handleSendMessage(transcript);
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
      <div className="fixed inset-0 z-50 bg-gray-900 text-white overflow-hidden font-sans flex flex-col items-center">
        {/* Premium Futuristic Background */}
        <div className="absolute inset-0 z-0 bg-gray-900 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-[#020617] z-0"></div>

          {/* Blue Aura Effects */}
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-primary-600/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 w-full max-w-3xl h-full flex flex-col pt-4 sm:pt-6 pb-4 sm:px-6">

          {/* Minimal Header */}
          <div className="px-4 w-full flex justify-between items-center opacity-80 shrink-0 h-10">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary-400" />
              <span className="text-sm font-semibold tracking-wider text-primary-50 uppercase">Order AI</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-white/90">
                  {isListening ? "LISTENING" : isProcessing ? "THINKING" : isSpeaking ? "SPEAKING" : "IDLE"}
                </span>
              </div>
            </div>
          </div>

          {!hasStarted ? (
            /* Initial Start State */
            <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in-up">
              <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                <div className="absolute inset-0 border border-primary-500/20 rounded-full animate-[spin_10s_linear_infinite] scale-110"></div>
                <div className="absolute inset-0 border border-primary-400/30 rounded-full animate-[spin_15s_linear_infinite_reverse] scale-125"></div>
                <button
                  onClick={handleStartCall}
                  className="group relative w-36 h-36 flex items-center justify-center rounded-full bg-primary-500/10 border border-primary-400/40 hover:bg-primary-500/20 transition-all duration-500 hover:scale-105 shadow-[0_0_40px_rgba(14,165,233,0.15)] hover:shadow-[0_0_60px_rgba(14,165,233,0.3)] z-10"
                >
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary-400 duration-[3000ms]"></div>
                  <Mic className="w-12 h-12 text-primary-400 group-hover:text-primary-300 transition-colors drop-shadow-md" />
                </button>
              </div>
              <h2 className="text-2xl font-light text-white mb-2 tracking-wide">Start Voice Order</h2>
              <p className="text-primary-200/60 font-light tracking-widest text-sm uppercase">Tap microphone to connect</p>
            </div>
          ) : (
            /* Active Call State */
            <div className="flex-1 min-h-0 w-full flex flex-col">

              {/* Chat History Area (Scrollable space natively expanding) */}
              <div
                id="chat-scroll-container"
                className="flex-1 overflow-y-auto px-4 sm:px-6 scroll-smooth"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="flex flex-col min-h-full">
                  <div className="flex flex-col gap-6 py-6 mt-auto">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-[24px] ${msg.type === 'user'
                          ? 'bg-primary-500 text-white rounded-br-sm shadow-[0_4px_25px_rgba(14,165,233,0.25)]'
                          : msg.isTyping
                            ? 'bg-transparent border border-white/10 text-gray-400 rounded-bl-sm'
                            : 'bg-white/10 backdrop-blur-md text-gray-50 rounded-bl-sm border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                          }`}>
                          {msg.isTyping ? (
                            <div className="flex items-center gap-1.5 h-6 px-2">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                          ) : (
                            <p className="text-[15px] sm:text-[16px] leading-[1.6] font-normal tracking-wide">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* User Active Transcript */}
                    {transcript && (
                      <div className="flex w-full justify-end animate-fade-in-up">
                        <div className="max-w-[85%] sm:max-w-[75%] p-4 rounded-[24px] bg-primary-500/40 backdrop-blur-md text-white rounded-br-sm border border-primary-400/30 shadow-[0_4px_20px_rgba(14,165,233,0.15)]">
                          <p className="text-[15px] sm:text-[16px] leading-[1.6] font-normal flex items-baseline gap-2">
                            {transcript}
                            <span className="flex gap-1">
                              <span className="w-1 h-1 bg-white/70 rounded-full animate-bounce"></span>
                              <span className="w-1 h-1 bg-white/70 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                              <span className="w-1 h-1 bg-white/70 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              {/* Call Controls Area */}
              <div className="w-full shrink-0 flex flex-col items-center pt-4 pb-2 border-t border-white/5 bg-gradient-to-t from-[#0f172a] to-transparent">

                {/* Voice Visualizer Orb */}
                <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                  {/* Outer Rings */}
                  <div className={`absolute inset-0 border border-primary-500/10 rounded-full box-border transition-all duration-700 ${isListening ? 'scale-125 opacity-100 animate-[spin_8s_linear_infinite]' : 'scale-100 opacity-20'}`}></div>
                  <div className={`absolute inset-2 border border-blue-400/20 rounded-full box-border transition-all duration-700 delay-75 ${isProcessing ? 'scale-110 opacity-70 animate-[spin_4s_linear_infinite_reverse]' : 'scale-100 opacity-20'}`}></div>

                  {/* Core Status Block */}
                  <div className={`absolute inset-0 flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-500 border
                     ${isListening ? 'bg-primary-500/10 border-primary-400/30 shadow-[0_0_30px_rgba(14,165,233,0.2)]' :
                      isSpeaking ? 'bg-green-500/10 border-green-400/30' :
                        'bg-white/5 border-white/10'}
                  `}>
                    {isSpeaking ? (
                      <div className="flex items-center gap-1.5 h-8">
                        {[1, 2.5, 4, 2.5, 1].map((scale, i) => (
                          <div key={i} className="w-1.5 bg-green-400 rounded-full animate-wave shadow-[0_0_10px_rgba(74,222,128,0.5)]" style={{ height: `${scale * 6}px`, animationDelay: `${i * 0.1}s` }}></div>
                        ))}
                      </div>
                    ) : isProcessing ? (
                      <div className="w-10 h-10 border-[3px] border-t-blue-400 border-r-blue-400/30 border-b-blue-400/10 border-l-blue-400/60 rounded-full animate-spin"></div>
                    ) : (
                      <Bot className={`w-8 h-8 transition-colors duration-300 ${isListening ? 'text-primary-400' : 'text-white/40'}`} />
                    )}
                  </div>
                </div>

                {/* Status Text */}
                <span className={`text-xs font-bold tracking-[0.2em] uppercase transition-colors duration-500 mb-2 ${isListening ? (isTranscribing ? "text-blue-400" : "text-primary-400") :
                  isProcessing ? "text-blue-400" :
                    isSpeaking ? "text-green-400" :
                      "text-slate-500"
                  }`}>
                  {isListening ? (isTranscribing ? "Transcribing..." : "Listening...") : isProcessing ? "Thinking..." : isSpeaking ? "Speaking..." : "Standby"}
                </span>

                {error && <p className="text-[10px] text-red-400 font-medium mb-4 animate-pulse">{error}</p>}

                {/* Buttons */}
                <div className="flex gap-6 items-center">
                  <button
                    onClick={handleToggleListening}
                    className={`
                      w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 border hover:scale-105 active:scale-95
                      ${isListening
                        ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                        : 'bg-primary-500 text-white border-primary-400/50 hover:bg-primary-600 shadow-[0_0_20px_rgba(14,165,233,0.2)]'}
                    `}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={handleClose}
                    className="w-14 h-14 rounded-full bg-white/10 text-white/70 border border-white/10 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all duration-300 hover:scale-105"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Global Styles for this component's animations */}
        <style>{`
            @keyframes wave {
                0%, 100% { height: 6px; }
                50% { height: 24px; }
            }
            .animate-fade-in-up {
                animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .scrollbar-hide::-webkit-scrollbar {
                display: none;
            }
            .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
        `}</style>
      </div>

      {/* Order Confirmation Modal - Kept as before */}
      {parsedOrder && <OrderConfirmationModal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={handleConfirmOrder} onEdit={handleEditOrder} parsedOrder={parsedOrder} confirmationMessage={VoiceOrderProcessor.generateConfirmationMessage(parsedOrder)} />}
    </>
  );
};

export default VoiceOrderModal;
