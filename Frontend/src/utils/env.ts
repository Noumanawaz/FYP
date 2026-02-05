// Helper to get environment variables that can be mocked in tests
// In Vite, this will use import.meta.env
// In Jest tests, this will use process.env or a mocked value

// Check if we're in a test environment (Jest sets this)
const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID);

const normalizeEnvValue = (value: unknown, defaultValue: string): string => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const stringValue = String(value);
  return stringValue.trim() === "" ? defaultValue : stringValue;
};

// Helper to safely get import.meta.env in Vite
// This avoids parse errors in Jest while working in Vite
function getViteEnv(): Record<string, any> | undefined {
  if (isTestEnv) {
    return undefined;
  }
  
  try {
    // Access import.meta.env directly - this works in Vite
    // We need to use a type assertion because TypeScript may not recognize it in all contexts
    // In Vite, import.meta.env is always available at runtime
    // @ts-expect-error - import.meta is available in Vite but may cause parse issues in Jest
    const metaEnv = import.meta?.env;
    if (metaEnv && typeof metaEnv === 'object') {
      return metaEnv;
    }
  } catch (e) {
    // Ignore errors - might not be available in all contexts
  }
  
  // Fallback: check if it was set on globalThis or window (for testing/mocking)
  const globalImport = (globalThis as any).import?.meta?.env;
  const windowImport = typeof window !== "undefined" ? (window as any).import?.meta?.env : undefined;
  
  return globalImport || windowImport;
}

export function getEnvVar(key: string, defaultValue: string = ""): string {
  // Check for mocked env (set in tests)
  if (typeof (globalThis as any).__MOCKED_ENV__ !== "undefined") {
    const mockedEnv = (globalThis as any).__MOCKED_ENV__;
    if (mockedEnv[key] !== undefined) {
      return normalizeEnvValue(mockedEnv[key], defaultValue);
    }
  }
  
  // In Jest/test environment, use process.env or the mocked import.meta from setupTests
  if (isTestEnv) {
    // Check if import.meta was mocked in setupTests
    const mockedImport = (globalThis as any).import?.meta?.env;
    if (mockedImport && mockedImport[key]) {
      return normalizeEnvValue(mockedImport[key], defaultValue);
    }
    // Fallback to process.env
    if (process.env[key]) {
      return normalizeEnvValue(process.env[key], defaultValue);
    }
    return defaultValue;
  }
  
  // Check for mocked import.meta from setupTests (works in Jest)
  const mockedImport = (globalThis as any).import?.meta?.env || (typeof window !== "undefined" && (window as any).import?.meta?.env);
  if (mockedImport && mockedImport[key] !== undefined && mockedImport[key] !== null) {
    return normalizeEnvValue(mockedImport[key], defaultValue);
  }
  
  // In Vite runtime, access import.meta.env
  const viteEnv = getViteEnv();
  if (viteEnv && typeof viteEnv === 'object' && viteEnv[key] !== undefined && viteEnv[key] !== null) {
    return normalizeEnvValue(viteEnv[key], defaultValue);
  }
  
  // Fallback - use process.env
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return normalizeEnvValue(process.env[key], defaultValue);
  }
  
  return defaultValue;
}
