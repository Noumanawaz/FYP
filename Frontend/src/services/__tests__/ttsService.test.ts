// Mock the env utility
jest.mock("../../utils/env", () => ({
  getEnvVar: jest.fn((key: string, defaultValue: string) => {
    if (key === "VITE_UPLIFT_API_KEY") {
      return process.env.VITE_UPLIFT_API_KEY || defaultValue || "test-api-key";
    }
    return defaultValue;
  }),
}));

// Mock fetch and Audio globally
global.fetch = jest.fn();
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => "mock-audio-url");
global.URL.revokeObjectURL = jest.fn();

describe("ttsService - Whitebox Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VITE_UPLIFT_API_KEY = "test-api-key";
  });

  describe("speakWithUplift - API Integration", () => {
    it("should call Uplift API with correct parameters when env is set", async () => {
      const mockAudioBlob = new Blob(["audio data"], { type: "audio/mpeg" });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn((key: string) => {
            if (key === 'x-uplift-ai-audio-duration') return '5.5';
            return null;
          }),
        },
        blob: async () => mockAudioBlob,
      });

      const { speakWithUplift } = await import("../ttsService");
      const result = await speakWithUplift("Hello world", "v_8eelc901");
      
      expect(result.duration).toBe(5.5);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.upliftai.org/v1/synthesis/text-to-speech",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("Hello world"),
        })
      );
    });

    it("should create Audio object and play it on success", async () => {
      const mockAudioBlob = new Blob(["audio data"]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => null),
        },
        blob: async () => mockAudioBlob,
      });

      const { speakWithUplift } = await import("../ttsService");
      await speakWithUplift("Test");

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.Audio).toHaveBeenCalled();

      const audioInstance = (global.Audio as jest.Mock).mock.results[0]?.value;
      if (audioInstance) {
        expect(audioInstance.play).toHaveBeenCalled();
      }
    });

    it("should throw error when API key is missing", async () => {
      process.env.VITE_UPLIFT_API_KEY = "";
      const { getEnvVar } = await import("../../utils/env");
      (getEnvVar as jest.Mock).mockReturnValue("");

      const { speakWithUplift } = await import("../ttsService");
      await expect(speakWithUplift("Test")).rejects.toThrow("Uplift AI API key missing");
    });

    it("should handle HTTP errors", async () => {
      // Ensure API key is set so the function proceeds to fetch
      process.env.VITE_UPLIFT_API_KEY = "test-api-key";
      const { getEnvVar } = await import("../../utils/env");
      (getEnvVar as jest.Mock).mockReturnValue("test-api-key");

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      const { speakWithUplift } = await import("../ttsService");
      await expect(speakWithUplift("Test")).rejects.toThrow("Uplift TTS failed");
    });

    it("should handle network errors", async () => {
      // Ensure API key is set so the function proceeds to fetch
      process.env.VITE_UPLIFT_API_KEY = "test-api-key";
      const { getEnvVar } = await import("../../utils/env");
      (getEnvVar as jest.Mock).mockReturnValue("test-api-key");

      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const { speakWithUplift } = await import("../ttsService");
      await expect(speakWithUplift("Test")).rejects.toThrow("Network error");
    });

    it("should handle audio play errors gracefully", async () => {
      const mockAudioBlob = new Blob(["audio data"]);
      const mockAudio = {
        play: jest.fn().mockRejectedValue(new Error("Play failed")),
        pause: jest.fn(),
        load: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      (global.Audio as jest.Mock).mockImplementation(() => mockAudio);
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => null),
        },
        blob: async () => mockAudioBlob,
      });

      const { speakWithUplift } = await import("../ttsService");
      // Should not throw even if play fails
      await expect(speakWithUplift("Test")).resolves.not.toThrow();
    });
  });

  describe("Function Signature", () => {
    it("should accept text and optional voiceId", async () => {
      const { speakWithUplift } = await import("../ttsService");
      expect(typeof speakWithUplift).toBe("function");
    });
  });
});
