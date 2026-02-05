import ChatbotService from "../chatbotService";

// Mock fetch globally
global.fetch = jest.fn();

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});

describe("ChatbotService - Whitebox Tests", () => {
  let chatbotService: ChatbotService;
  const mockBaseUrl = "http://localhost:8000";

  beforeEach(() => {
    chatbotService = new ChatbotService(mockBaseUrl);
    (fetch as jest.Mock).mockClear();
  });

  describe("Constructor", () => {
    it("should initialize with default baseUrl", () => {
      const service = new ChatbotService();
      expect(service).toBeInstanceOf(ChatbotService);
    });

    it("should initialize with custom baseUrl", () => {
      const service = new ChatbotService("http://custom-url.com");
      expect(service).toBeInstanceOf(ChatbotService);
    });
  });

  describe("sendMessage", () => {
    it("should send message and return response", async () => {
      const mockResponse = {
        response: "Hello! How can I help you?",
        response_en: "Hello! How can I help you?",
        response_ur: "ہیلو! میں آپ کی کس طرح مدد کر سکتا ہوں؟",
        customer_name: "John",
        current_order: [],
        order_summary: "",
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await chatbotService.sendMessage("Hello");

      expect(fetch).toHaveBeenCalledWith(`${mockBaseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Hello" }),
      });

      expect(result.response).toBe("Hello! How can I help you?");
      expect(result.customer_name).toBe("John");
    });

    it("should add user message to conversation history", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      await chatbotService.sendMessage("Test message");

      const history = chatbotService.getConversationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].isUser).toBe(true);
      expect(history[0].message).toBe("Test message");
      expect(history[1].isUser).toBe(false);
    });

    it("should prefer response_en over response", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Old response",
          response_en: "New English response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      const result = await chatbotService.sendMessage("Test");

      expect(result.response).toBe("New English response");
      expect(result.response_en).toBe("New English response");
    });

    it("should handle HTTP errors", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await chatbotService.sendMessage("Test");

      expect(result.error).toBeDefined();
      expect(result.response).toContain("trouble connecting");
    });

    it("should handle network errors", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const result = await chatbotService.sendMessage("Test");

      expect(result.error).toBe("Network error");
      expect(result.response).toContain("trouble connecting");
    });

    it("should include timestamp in conversation history", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      await chatbotService.sendMessage("Test");

      const history = chatbotService.getConversationHistory();
      expect(history[0].timestamp).toBeDefined();
      expect(new Date(history[0].timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("sendVoiceData", () => {
    it("should send voice data and return response", async () => {
      const mockResponse = {
        transcribed_message: "I want pizza",
        response: "I understood your order",
        response_en: "I understood your order",
        customer_name: "John",
        current_order: [],
        order_summary: "",
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const audioBlob = new Blob(["audio data"], { type: "audio/wav" });
      const result = await chatbotService.sendVoiceData(audioBlob);

      const callArgs = (fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe(`${mockBaseUrl}/voice-chat`);
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBeInstanceOf(FormData);

      expect(result.response).toBe("I understood your order");
      expect(result.customer_name).toBe("John");
    });

    it("should add transcribed message to conversation history", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transcribed_message: "I want pizza",
          response: "Response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      const audioBlob = new Blob(["audio data"]);
      await chatbotService.sendVoiceData(audioBlob);

      const history = chatbotService.getConversationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe("I want pizza");
      expect(history[0].isUser).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Voice error"));

      const audioBlob = new Blob(["audio data"]);
      const result = await chatbotService.sendVoiceData(audioBlob);

      expect(result.error).toBe("Voice error");
      expect(result.response).toContain("trouble processing your voice message");
    });
  });

  describe("Conversation History Management", () => {
    it("should return conversation history", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: "Response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      await chatbotService.sendMessage("Message 1");
      await chatbotService.sendMessage("Message 2");

      const history = chatbotService.getConversationHistory();
      expect(history).toHaveLength(4); // 2 user + 2 bot
    });

    it("should return a copy of conversation history", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      await chatbotService.sendMessage("Test");
      const history1 = chatbotService.getConversationHistory();
      const history2 = chatbotService.getConversationHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });

    it("should clear conversation history", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      await chatbotService.sendMessage("Test");
      expect(chatbotService.getConversationHistory().length).toBeGreaterThan(0);

      chatbotService.clearConversationHistory();
      expect(chatbotService.getConversationHistory()).toHaveLength(0);
    });
  });

  describe("setBaseUrl", () => {
    it("should update baseUrl", async () => {
      const newUrl = "http://new-url.com";
      chatbotService.setBaseUrl(newUrl);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      await chatbotService.sendMessage("Test");

      expect(fetch).toHaveBeenCalledWith(`${newUrl}/chat`, expect.any(Object));
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty response fields", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Response",
        }),
      });

      const result = await chatbotService.sendMessage("Test");

      expect(result.customer_name).toBe("");
      expect(result.current_order).toEqual([]);
      expect(result.order_summary).toBe("");
    });

    it("should handle missing transcribed_message in voice response", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Response",
          customer_name: "",
          current_order: [],
          order_summary: "",
        }),
      });

      const audioBlob = new Blob(["audio data"]);
      await chatbotService.sendVoiceData(audioBlob);

      const history = chatbotService.getConversationHistory();
      // Should only have bot response, no transcribed message
      expect(history).toHaveLength(1);
      expect(history[0].isUser).toBe(false);
    });
  });
});
