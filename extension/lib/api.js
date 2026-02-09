import { getApiBaseUrl } from "./config.js";
import { ensureAccessToken, refreshExtensionToken, clearAuthState } from "./auth.js";

function buildUrl(path, params) {
  const query = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }
      query.append(key, String(value));
    });
  }

  return query.toString() ? `${path}?${query.toString()}` : path;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

function createApiError(response, payload) {
  const error = new Error(payload?.detail || `Request failed with status ${response.status}`);
  error.status = response.status;
  error.payload = payload;
  return error;
}

async function request(path, { method = "GET", body, params, retryOnUnauthorized = true } = {}) {
  const baseUrl = await getApiBaseUrl();
  const token = await ensureAccessToken();
  const response = await fetch(`${baseUrl}${buildUrl(path, params)}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);

  if (response.status === 401 && retryOnUnauthorized) {
    try {
      const refreshedToken = await refreshExtensionToken();
      const retryResponse = await fetch(`${baseUrl}${buildUrl(path, params)}`, {
        method,
        headers: {
          Authorization: `Bearer ${refreshedToken}`,
          "Content-Type": "application/json",
          "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const retryPayload = await parseResponse(retryResponse);
      if (!retryResponse.ok) {
        if (retryResponse.status === 401) {
          await clearAuthState();
        }
        throw createApiError(retryResponse, retryPayload);
      }
      return retryPayload;
    } catch (error) {
      await clearAuthState();
      throw error;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthState();
    }
    throw createApiError(response, payload);
  }

  return payload;
}

export async function getPomodoroPreferences() {
  return request("/pomodoro/preferences");
}

export async function getActiveSession() {
  const sessions = await request("/pomodoro/sessions", {
    params: { status: "in_progress", limit: 1, skip: 0 },
  });
  return sessions?.[0] ?? null;
}

export async function startPomodoroSession(payload) {
  return request("/pomodoro/sessions/start", {
    method: "POST",
    body: payload,
  });
}

export async function completePomodoroSession(sessionId, payload) {
  return request(`/pomodoro/sessions/${sessionId}/complete`, {
    method: "POST",
    body: payload || {},
  });
}

export async function abandonPomodoroSession(sessionId, payload) {
  return request(`/pomodoro/sessions/${sessionId}/abandon`, {
    method: "POST",
    body: payload || {},
  });
}

export async function listLearningProjects(filters = {}) {
  return request("/learning-projects/", {
    params: { limit: 100, skip: 0, ...filters },
  });
}

export async function getCurrentUser() {
  return request("/auth/me");
}
