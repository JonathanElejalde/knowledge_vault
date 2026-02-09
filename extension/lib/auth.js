import { getApiBaseUrl } from "./config.js";
import {
  getStoredValue,
  setStoredValue,
  removeStoredValue,
  STORAGE_AREA_LOCAL,
  STORAGE_AREA_SESSION,
} from "./storage.js";

const ACCESS_STATE_KEY = "kv_extension_access_state";
const REFRESH_TOKEN_KEY = "kv_extension_refresh_token";
const USER_KEY = "kv_extension_user";

function createAuthError(message, status = 401) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}

async function authRequest(path, { method = "POST", body } = {}) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = payload?.detail || "Authentication request failed";
    throw createAuthError(message, response.status);
  }

  return payload;
}

async function persistTokenPayload(payload) {
  const expiresAt = Date.now() + payload.expires_in * 1000;

  await setStoredValue(
    ACCESS_STATE_KEY,
    {
      accessToken: payload.access_token,
      expiresAt,
    },
    STORAGE_AREA_SESSION
  );
  await setStoredValue(REFRESH_TOKEN_KEY, payload.refresh_token, STORAGE_AREA_SESSION);
  await setStoredValue(USER_KEY, payload.user, STORAGE_AREA_SESSION);
}

export async function extensionLogin(email, password) {
  const payload = await authRequest("/auth/extension/login", {
    body: { email, password },
  });
  await persistTokenPayload(payload);
  return payload.user;
}

export async function getStoredUser() {
  return getStoredValue(USER_KEY, STORAGE_AREA_SESSION);
}

export async function getRefreshToken() {
  return getStoredValue(REFRESH_TOKEN_KEY, STORAGE_AREA_SESSION);
}

export async function clearAuthState() {
  await removeStoredValue(ACCESS_STATE_KEY, STORAGE_AREA_SESSION);
  await removeStoredValue(REFRESH_TOKEN_KEY, STORAGE_AREA_SESSION);
  await removeStoredValue(USER_KEY, STORAGE_AREA_SESSION);
  // Clear legacy keys from local (pre–session-storage migration)
  await removeStoredValue(REFRESH_TOKEN_KEY, STORAGE_AREA_LOCAL);
  await removeStoredValue(USER_KEY, STORAGE_AREA_LOCAL);
}

export async function refreshExtensionToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearAuthState();
    throw createAuthError("Not authenticated", 401);
  }

  const payload = await authRequest("/auth/extension/refresh-token", {
    body: { refresh_token: refreshToken },
  });
  await persistTokenPayload(payload);
  return payload.access_token;
}

export async function ensureAccessToken() {
  const accessState = await getStoredValue(ACCESS_STATE_KEY, STORAGE_AREA_SESSION);
  const now = Date.now();
  const refreshWindowMs = 30 * 1000;

  if (accessState?.accessToken && accessState.expiresAt - refreshWindowMs > now) {
    return accessState.accessToken;
  }

  return refreshExtensionToken();
}

export async function isAuthenticated() {
  const refreshToken = await getRefreshToken();
  return Boolean(refreshToken);
}

export async function extensionLogout() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await authRequest("/auth/extension/logout", {
        body: { refresh_token: refreshToken },
      });
    } catch {
      // We clear local auth state even if remote logout fails.
    }
  }
  await clearAuthState();
}
