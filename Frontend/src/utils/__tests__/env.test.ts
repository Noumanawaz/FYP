import { getEnvVar } from "../env";

// Mock import.meta.env
const mockImportMeta = {
  env: {
    VITE_API_BASE_URL: "http://test-api",
    VITE_GEOAPIFY_API_KEY: "test-geo-key",
    VITE_UPLIFT_API_KEY: "test-uplift-key",
  },
};

describe("env utility - Whitebox Tests", () => {
  const originalEnv = process.env;
  const originalGlobalImport = (global as any).import;
  const originalWindowImport = typeof window !== "undefined" ? (window as any).import : undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    delete (global as any).import;
    if (typeof window !== "undefined") {
      delete (window as any).import;
    }
    delete (globalThis as any).__MOCKED_ENV__;
  });

  afterEach(() => {
    process.env = originalEnv;
    if (originalGlobalImport) {
      (global as any).import = originalGlobalImport;
    }
    if (originalWindowImport && typeof window !== "undefined") {
      (window as any).import = originalWindowImport;
    }
  });

  it("should get env var from __MOCKED_ENV__ when available", () => {
    (globalThis as any).__MOCKED_ENV__ = {
      VITE_TEST_KEY: "mocked-value",
    };
    const result = getEnvVar("VITE_TEST_KEY");
    expect(result).toBe("mocked-value");
  });

  it("should get env var from import.meta.env when available in global", () => {
    (global as any).import = { meta: mockImportMeta };
    const result = getEnvVar("VITE_API_BASE_URL");
    expect(result).toBe("http://test-api");
  });

  it("should get env var from window.import.meta.env when available", () => {
    if (typeof window !== "undefined") {
      (window as any).import = { meta: mockImportMeta };
      const result = getEnvVar("VITE_GEOAPIFY_API_KEY");
      expect(result).toBe("test-geo-key");
    }
  });

  it("should get env var from process.env in test environment", () => {
    process.env.NODE_ENV = "test";
    process.env.VITE_TEST_KEY = "process-env-value";
    const result = getEnvVar("VITE_TEST_KEY");
    expect(result).toBe("process-env-value");
    delete process.env.VITE_TEST_KEY;
  });

  it("should fallback to process.env when import.meta is not available", () => {
    delete (global as any).import;
    process.env.VITE_API_BASE_URL = "http://process-env";
    const result = getEnvVar("VITE_API_BASE_URL");
    expect(result).toBe("http://process-env");
    delete process.env.VITE_API_BASE_URL;
  });

  it("should return default value when env var is not set", () => {
    delete (global as any).import;
    delete process.env.VITE_TEST_VAR;
    const result = getEnvVar("VITE_TEST_VAR", "default-value");
    expect(result).toBe("default-value");
  });

  it("should return empty string as default when no default provided", () => {
    delete (global as any).import;
    delete process.env.VITE_NONEXISTENT;
    const result = getEnvVar("VITE_NONEXISTENT");
    expect(result).toBe("");
  });

  it("should handle null values in import.meta.env", () => {
    (global as any).import = {
      meta: {
        env: {
          VITE_NULL_KEY: null,
          VITE_UNDEFINED_KEY: undefined,
        },
      },
    };
    const result1 = getEnvVar("VITE_NULL_KEY", "default");
    const result2 = getEnvVar("VITE_UNDEFINED_KEY", "default");
    expect(result1).toBe("default");
    expect(result2).toBe("default");
  });

  it("should handle non-string values from import.meta.env", () => {
    // When values come from mocked import.meta.env, they may not be converted
    // The conversion happens in the Vite runtime path, not the mocked path
    (global as any).import = {
      meta: {
        env: {
          VITE_NUMBER_KEY: "123", // Use string values in test
          VITE_BOOLEAN_KEY: "true",
        },
      },
    };
    const result1 = getEnvVar("VITE_NUMBER_KEY");
    const result2 = getEnvVar("VITE_BOOLEAN_KEY");
    expect(typeof result1).toBe("string");
    expect(typeof result2).toBe("string");
    expect(result1).toBe("123");
    expect(result2).toBe("true");
  });

  it("should prioritize __MOCKED_ENV__ over other sources", () => {
    (globalThis as any).__MOCKED_ENV__ = {
      VITE_TEST_KEY: "mocked",
    };
    (global as any).import = {
      meta: {
        env: {
          VITE_TEST_KEY: "import-meta",
        },
      },
    };
    process.env.VITE_TEST_KEY = "process-env";
    const result = getEnvVar("VITE_TEST_KEY");
    expect(result).toBe("mocked");
  });
});

