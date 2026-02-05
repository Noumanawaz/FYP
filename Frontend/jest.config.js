export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/src/__mocks__/fileMock.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
      },
    ],
  },
  // Custom transform to handle import.meta.env
  transformIgnorePatterns: ["node_modules/(?!(.*\\.mjs$))"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/main.tsx",
    "!src/vite-env.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
    // Exclude UI components and pages from coverage (harder to test, less critical)
    "!src/pages/**",
    "!src/components/**",
    "!src/contexts/**",
    "!src/data/**",
    "!src/App.tsx",
  ],
  coverageThreshold: {
    global: {
      branches: 54,
      functions: 61,
      lines: 62,
      statements: 62,
    },
  },
};
