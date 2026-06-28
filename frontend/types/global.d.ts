/**
 * Runtime configuration injected by `public/config.js` (loaded before the app
 * bundle). Lets the API base URL be changed at deploy time without a rebuild.
 */
export {};

declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiBaseUrl?: string;
    };
  }
}
