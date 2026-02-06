import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Send, RotateCcw, MessageSquare, Bot, User, ChefHat, Star } from "lucide-react";
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

const VoiceOrderModal: React.FC<VoiceOrderModalProps> = ({ isOpen, onClose, onOrderSubmit }) => {
  const { isListening, transcript, isSupported, error, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatbotServiceRef = useRef<ChatbotService>(new ChatbotService());
  const isSpeakingRef = useRef<boolean>(false);

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
  // TTS (prefer Uplift, fallback to browser TTS). Auto-pick voice by text script.
  const speak = async (text: string) => {
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
          await speakWithUplift(text, isUrduScript ? urduVoiceId : englishVoiceId, upliftApiKey);
          console.info("[OrderModal][TTS] Uplift playback queued");
          return;
        } catch (e) {
          console.warn("[OrderModal][TTS] Uplift failed, falling back to browser TTS", e);
        }
      } else {
        console.info("[OrderModal][TTS] Uplift API key not configured, using browser TTS");
      }

      if (!("speechSynthesis" in window)) {
        console.warn("[OrderModal][TTS] speechSynthesis not available");
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
      utter.onend = () => {
        isSpeakingRef.current = false;
        console.log("[OrderModal][TTS] playback ended");
      };

      utter.onerror = (e) => {
        console.error("[OrderModal][TTS] playback error", e);
        isSpeakingRef.current = false;
      };

      try {
        window.speechSynthesis.speak(utter);
        console.info("[OrderModal][TTS] Browser playback queued");
      } catch (e) {
        console.error("[OrderModal][TTS] Browser speak failed", e);
      }
    } catch (e) {
      console.error("[OrderModal][TTS] Speak error", e);
    }
  };

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: "1",
        type: "bot",
        content: "Welcome to Vocabite AI Assistant. I can help you with:\n\n**Ordering Food** - Tell me what you'd like to order\n**Menu Recommendations** - Ask about popular dishes\n**General Questions** - About Pakistani cuisine, delivery times, etc.\n\nWhat would you like to know or order today?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

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
      speak(speakText);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full h-[700px] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Bot className="w-7 h-7 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Vocabite AI Assistant</h3>
                  <p className="text-sm text-gray-500">Voice ordering & recommendations for Pakistani cuisine</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Side - Voice Interface */}
            <div className="w-1/3 border-r border-gray-200 p-6 flex flex-col">
              <div className="text-center mb-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${isListening ? "bg-red-100 animate-pulse scale-110" : "bg-primary-100"}`}>
                  <button onClick={handleToggleListening} disabled={isProcessing} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${isListening ? "bg-red-500 hover:bg-red-600 shadow-lg" : "bg-primary-500 hover:bg-primary-600"} ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{isProcessing ? "Processing..." : isListening ? "Listening... Speak now" : "Tap to start voice input"}</p>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Quick Actions</h4>
                <div className="space-y-2">
                  <button onClick={() => setInputText("What's popular today?")} className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    Popular dishes
                  </button>
                  <button onClick={() => setInputText("What do you recommend?")} className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    Get recommendations
                  </button>
                  <button onClick={() => setInputText("How long does delivery take?")} className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    Delivery times
                  </button>
                </div>
              </div>

              {/* Example Orders */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Try saying:</h4>
                <div className="space-y-2 text-xs text-gray-500">
                  <p>"I want chicken biryani with extra raita"</p>
                  <p>"Order 2 karahi gosht and 4 naan"</p>
                  <p>"Get me seekh kebab with mint chutney"</p>
                  <p>"3 chicken tikka and 2 lassi"</p>
                </div>
              </div>

              {/* Reset Button */}
              <div className="mt-auto">
                <button onClick={handleReset} disabled={isProcessing} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Conversation</span>
                </button>
              </div>
            </div>

            {/* Right Side - Chat Interface */}
            <div className="flex-1 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex items-start space-x-3 max-w-[85%] ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === "user" ? "bg-primary-500" : "bg-gray-100"}`}>{message.type === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-gray-600" />}</div>
                      <div className={`px-4 py-3 rounded-2xl ${message.type === "user" ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-900"}`}>
                        {message.isTyping ? (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-line text-sm leading-relaxed">{message.content}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={handleKeyPress} placeholder={isListening ? "Listening..." : "Type your message or use voice..."} disabled={isProcessing} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12 disabled:bg-gray-50" />
                    <button onClick={handleSendMessage} disabled={!inputText.trim() || isProcessing} className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-2 text-center">
                  {isListening && (
                    <p className="text-sm text-red-600 flex items-center justify-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse inline-block"></span>
                      Listening... Speak now
                    </p>
                  )}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {parsedOrder && <OrderConfirmationModal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={handleConfirmOrder} onEdit={handleEditOrder} parsedOrder={parsedOrder} confirmationMessage={VoiceOrderProcessor.generateConfirmationMessage(parsedOrder)} />}
    </>
  );
};

export default VoiceOrderModal;
