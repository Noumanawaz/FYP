// Use getEnvVar helper to support both Vite and Jest environments
import { getEnvVar } from '../utils/env';

export interface ChatbotMessage {
  message: string;
  timestamp: string;
  isUser: boolean;
}

export interface ChatbotResponse {
  response: string; // English (backward compatible)
  response_en?: string;
  response_ur?: string;
  customer_name: string;
  current_order: any[];
  order_summary: string;
  error?: string;
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

class ChatbotService {
  private baseUrl: string;
  private conversationHistory: ChatbotMessage[] = [];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getChatbotBaseUrl();
  }

  async sendMessage(message: string): Promise<ChatbotResponse> {
    try {
      // Add user message to conversation history
      this.conversationHistory.push({
        message,
        timestamp: new Date().toISOString(),
        isUser: true,
      });

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add bot response to conversation history
      this.conversationHistory.push({
        message: data.response,
        timestamp: new Date().toISOString(),
        isUser: false,
      });

      return {
        response: data.response_en || data.response, // prefer explicit english
        response_en: data.response_en || data.response,
        response_ur: data.response_ur,
        customer_name: data.customer_name || "",
        current_order: data.current_order || [],
        order_summary: data.order_summary || "",
      };
    } catch (error) {
      console.error("Error sending message to chatbot:", error);
      return {
        response: "I'm sorry, I'm having trouble connecting to the server right now. Please try again later.",
        customer_name: "",
        current_order: [],
        order_summary: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendVoiceData(audioBlob: Blob): Promise<ChatbotResponse> {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice_message.wav");

      const response = await fetch(`${this.baseUrl}/voice-chat`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add both transcribed message and bot response to conversation history
      if (data.transcribed_message) {
        this.conversationHistory.push({
          message: data.transcribed_message,
          timestamp: new Date().toISOString(),
          isUser: true,
        });
      }

      this.conversationHistory.push({
        message: data.response_en || data.response,
        timestamp: new Date().toISOString(),
        isUser: false,
      });

      return {
        response: data.response_en || data.response,
        response_en: data.response_en || data.response,
        response_ur: data.response_ur,
        customer_name: data.customer_name || "",
        current_order: data.current_order || [],
        order_summary: data.order_summary || "",
      };
    } catch (error) {
      console.error("Error sending voice data to chatbot:", error);
      return {
        response: "I'm sorry, I'm having trouble processing your voice message. Please try again.",
        customer_name: "",
        current_order: [],
        order_summary: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  getConversationHistory(): ChatbotMessage[] {
    return [...this.conversationHistory];
  }

  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}

export default ChatbotService;
