import { API_BASE_URL, FRONTEND_BASE_URL } from "./env.generated.js";

/**
 * API and frontend base URLs are fixed at build time (see scripts/build-extension-config.js).
 * Not configurable by users.
 */

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getFrontendBaseUrl() {
  return FRONTEND_BASE_URL;
}

export { API_BASE_URL as DEFAULT_API_BASE_URL, FRONTEND_BASE_URL as DEFAULT_FRONTEND_BASE_URL };
