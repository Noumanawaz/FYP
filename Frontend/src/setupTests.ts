import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// Configure testing library
configure({ testIdAttribute: "data-testid" });

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock geolocation
Object.defineProperty(navigator, "geolocation", {
  writable: true,
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
});

// Mock Audio
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock import.meta.env for Vite - this needs to be done before any modules are imported
// We'll set it up so it's available globally
if (typeof global !== "undefined") {
  (global as any).import = {
    meta: {
      env: {
        VITE_API_BASE_URL: "http://localhost:3000/api/v1",
        VITE_GEOAPIFY_API_KEY: "",
        VITE_UPLIFT_API_KEY: "test-api-key",
      },
    },
  };
}

// Also set it on window for browser context
if (typeof window !== "undefined") {
  (window as any).import = {
    meta: {
      env: {
        VITE_API_BASE_URL: "http://localhost:3000/api/v1",
        VITE_GEOAPIFY_API_KEY: "",
        VITE_UPLIFT_API_KEY: "test-api-key",
      },
    },
  };
}

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
