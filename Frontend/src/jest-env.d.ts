/// <reference types="vite/client" />

// Extend ImportMeta for Jest tests
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GEOAPIFY_API_KEY?: string;
  readonly VITE_UPLIFT_API_KEY?: string;
  readonly [key: string]: any;
}

