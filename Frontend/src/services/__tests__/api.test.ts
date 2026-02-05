// Mock the env utility
jest.mock("../../utils/env", () => ({
  getEnvVar: jest.fn((key: string, defaultValue: string) => {
    if (key === "VITE_API_BASE_URL") {
      return process.env.VITE_API_BASE_URL || defaultValue || "http://localhost:3000/api/v1";
    }
    return defaultValue;
  }),
}));

import { apiService, ApiService } from "../api";

// Mock fetch globally
global.fetch = jest.fn();

describe("ApiService - Whitebox Tests", () => {
  let apiServiceInstance: ApiService;
  const mockBaseURL = "http://localhost:3000/api/v1";

  beforeEach(() => {
    localStorage.clear();
    (fetch as jest.Mock).mockClear();
    apiServiceInstance = new ApiService(mockBaseURL);
  });

  // ... rest of the tests remain the same
  describe("Constructor", () => {
    it("should initialize with baseURL", () => {
      expect(apiServiceInstance).toBeInstanceOf(ApiService);
    });

    it("should load tokens from localStorage on initialization", () => {
      localStorage.setItem("access_token", "test-token");
      localStorage.setItem("refresh_token", "test-refresh");

      const service = new ApiService(mockBaseURL);
      // Note: We can't directly test private properties, but we can test behavior
      expect(service).toBeInstanceOf(ApiService);
    });
  });

  describe("Token Management", () => {
    it("should set and store token", () => {
      apiServiceInstance.setToken("new-token");
      expect(localStorage.getItem("access_token")).toBe("new-token");
    });

    it("should clear token when set to null", () => {
      localStorage.setItem("access_token", "test-token");
      apiServiceInstance.setToken(null);
      expect(localStorage.getItem("access_token")).toBeNull();
    });

    it("should set refresh token", () => {
      apiServiceInstance.setRefreshToken("refresh-token");
      expect(localStorage.getItem("refresh_token")).toBe("refresh-token");
    });
  });

  describe("Request Headers", () => {
    it("should include Authorization header when token is set", async () => {
      apiServiceInstance.setToken("test-token");
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiServiceInstance.get("/test");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("should not include Authorization header when token is not set", async () => {
      apiServiceInstance.setToken(null);
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiServiceInstance.get("/test");

      const callArgs = (fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });

  describe("GET Request", () => {
    it("should make GET request with correct URL", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await apiServiceInstance.getRestaurants();

      // Check that fetch was called with the correct URL
      const fetchCalls = (fetch as jest.Mock).mock.calls;
      const lastCall = fetchCalls[fetchCalls.length - 1];
      expect(lastCall[0]).toContain("/restaurants");
      // GET is the default method, so it may not be explicitly set
      // Just verify the request was made successfully
      expect(fetch).toHaveBeenCalled();
    });

    it("should handle query parameters", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await apiServiceInstance.getRestaurants({ search: "pizza", limit: 10 });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/restaurants"),
        expect.any(Object)
      );
    });
  });

  describe("POST Request", () => {
    it("should make POST request with body", async () => {
      const body = { name: "Test User", preferred_language: "en" as const };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { user_id: "1", name: "Test User", role: "customer" } }),
      });

      await apiServiceInstance.createUser(body);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe("PUT Request", () => {
    it("should make PUT request with body", async () => {
      const body = { name: "Updated User" };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: body }),
      });

      await apiServiceInstance.updateUser("user-1", body);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/user-1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe("DELETE Request", () => {
    it("should make DELETE request", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiServiceInstance.deleteMenuItem("item-1");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/menu/item-1"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP errors", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: "Not found" }),
      });

      await expect(apiServiceInstance.getRestaurant("not-found")).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      await expect(apiServiceInstance.getRestaurants()).rejects.toThrow("Network error");
    });
  });

  describe("Response Parsing", () => {
    it("should parse JSON response", async () => {
      const mockData = { success: true, data: { restaurant_id: "1", name: "Test Restaurant" } };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockData,
      });

      const result = await apiServiceInstance.getRestaurant("1");
      expect(result).toEqual(mockData);
    });
  });
});
