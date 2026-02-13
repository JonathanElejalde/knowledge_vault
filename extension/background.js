import {
  getPomodoroPreferences,
  getActiveSession,
  startPomodoroSession,
  completePomodoroSession,
  abandonPomodoroSession,
} from "./lib/api.js";
import { getFrontendBaseUrl } from "./lib/config.js";
import { getStoredValue, setStoredValue, removeStoredValue, STORAGE_AREA_LOCAL } from "./lib/storage.js";

const TIMER_STATE_KEY = "kv_extension_timer_state";
const PHASE_COMPLETION_ALARM = "kv_extension_phase_completion";
let notesWindowId = null;

// ---------------------------------------------------------------------------
// Timer state helpers
// ---------------------------------------------------------------------------

function toTimerState(session, preferences) {
  return {
    sessionId: session.id,
    projectId: session.learning_project_id ?? null,
    phase: "work",
    startedAt: new Date(session.start_time).getTime(),
    durationMinutes: session.work_duration,
    isPaused: false,
    pausedAt: null,
    accumulatedPausedMs: 0,
    completedIntervals: 0,
    preferences: preferences
      ? {
          work_duration: preferences.work_duration,
          break_duration: preferences.break_duration,
          long_break_duration: preferences.long_break_duration,
          long_break_interval: preferences.long_break_interval,
        }
      : null,
  };
}

async function getTimerState() {
  return getStoredValue(TIMER_STATE_KEY, STORAGE_AREA_LOCAL);
}

async function setTimerState(state) {
  await setStoredValue(TIMER_STATE_KEY, state, STORAGE_AREA_LOCAL);
}

async function clearTimerState() {
  await removeStoredValue(TIMER_STATE_KEY, STORAGE_AREA_LOCAL);
}

// ---------------------------------------------------------------------------
// Duration / elapsed helpers
// ---------------------------------------------------------------------------

function getEffectiveElapsedMs(timerState) {
  if (!timerState?.startedAt) {
    return 0;
  }
  const now = timerState.isPaused && timerState.pausedAt ? timerState.pausedAt : Date.now();
  return Math.max(0, now - timerState.startedAt - (timerState.accumulatedPausedMs || 0));
}

function calculateActualDurationMinutes(timerState) {
  const elapsedMs = getEffectiveElapsedMs(timerState);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  return Math.max(1, elapsedMinutes);
}

function getPhaseEndTimestamp(timerState) {
  if (!timerState?.startedAt || !timerState?.durationMinutes) {
    return null;
  }
  const durationMs = timerState.durationMinutes * 60 * 1000;
  return timerState.startedAt + durationMs + (timerState.accumulatedPausedMs || 0);
}

// ---------------------------------------------------------------------------
// Alarm management
// ---------------------------------------------------------------------------

async function scheduleCompletionAlarm(timerState) {
  if (!timerState?.phase || timerState.isPaused) {
    await chrome.alarms.clear(PHASE_COMPLETION_ALARM);
    return;
  }

  const endTimestamp = getPhaseEndTimestamp(timerState);
  if (!endTimestamp) {
    return;
  }

  await chrome.alarms.create(PHASE_COMPLETION_ALARM, { when: endTimestamp });
}

async function clearCompletionAlarm() {
  await chrome.alarms.clear(PHASE_COMPLETION_ALARM);
}

// ---------------------------------------------------------------------------
// Offscreen sound playback
// ---------------------------------------------------------------------------

async function ensureOffscreenDocument() {
  try {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play notification sounds when timer phases complete",
    });
  } catch {
    // Document already exists or creation not supported — ignore.
  }
}

async function playSound(file) {
  try {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({ type: "offscreen:play-sound", file });
  } catch {
    // Sound is best-effort; don't break timer flow.
  }
}

// ---------------------------------------------------------------------------
// Sync with backend
// ---------------------------------------------------------------------------

async function syncActiveSessionState() {
  const localState = await getTimerState();

  // Break phases are local-only — preserve them without backend query.
  if (localState?.phase === "break" || localState?.phase === "longBreak") {
    return localState;
  }

  const activeSession = await getActiveSession();
  if (!activeSession) {
    await clearCompletionAlarm();
    await clearTimerState();
    return null;
  }

  const state = toTimerState(activeSession, localState?.preferences);
  if (localState?.sessionId === state.sessionId) {
    state.accumulatedPausedMs = localState.accumulatedPausedMs || 0;
    state.isPaused = Boolean(localState.isPaused);
    state.pausedAt = localState.pausedAt || null;
    state.completedIntervals = localState.completedIntervals || 0;
    state.preferences = localState.preferences || state.preferences;
  }

  await setTimerState(state);
  await scheduleCompletionAlarm(state);
  return state;
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

async function startSession(projectId) {
  const existingState = await syncActiveSessionState();
  if (existingState?.phase) {
    // Already in an active phase (work running, break, etc.)
    if (existingState.isPaused) {
      return resumeSession(existingState);
    }
    return existingState;
  }

  const preferences = await getPomodoroPreferences();

  const sessionPayload = {
    learning_project_id: projectId || undefined,
    session_type: "work",
    work_duration: preferences.work_duration,
    break_duration: preferences.break_duration,
  };

  const session = await startPomodoroSession(sessionPayload);
  const timerState = toTimerState(session, preferences);
  await setTimerState(timerState);
  await scheduleCompletionAlarm(timerState);
  return timerState;
}

async function pauseSession() {
  const timerState = await getTimerState();
  if (!timerState?.phase) {
    return null;
  }
  if (timerState.isPaused) {
    return timerState;
  }

  const pausedState = {
    ...timerState,
    isPaused: true,
    pausedAt: Date.now(),
  };
  await clearCompletionAlarm();
  await setTimerState(pausedState);
  return pausedState;
}

async function resumeSession(stateArg) {
  const timerState = stateArg ?? (await getTimerState());
  if (!timerState?.phase) {
    return null;
  }
  if (!timerState.isPaused || !timerState.pausedAt) {
    await scheduleCompletionAlarm(timerState);
    return timerState;
  }

  const resumedState = {
    ...timerState,
    isPaused: false,
    accumulatedPausedMs:
      (timerState.accumulatedPausedMs || 0) + Math.max(0, Date.now() - timerState.pausedAt),
    pausedAt: null,
  };

  await setTimerState(resumedState);
  await scheduleCompletionAlarm(resumedState);
  return resumedState;
}

// ---------------------------------------------------------------------------
// Phase completion handlers
// ---------------------------------------------------------------------------

async function handleWorkCompletion() {
  const timerState = await getTimerState();
  if (!timerState?.sessionId || timerState.phase !== "work") {
    return;
  }

  // Complete backend session
  await completePomodoroSession(timerState.sessionId, {
    actual_duration: calculateActualDurationMinutes(timerState),
  });

  // Play work-complete sound
  await playSound("sounds/positive-notification.wav");

  // Determine next break phase
  const prefs = timerState.preferences;
  if (!prefs) {
    // No cached preferences — fall back to idle
    await clearCompletionAlarm();
    await clearTimerState();
    return;
  }

  const newIntervals = (timerState.completedIntervals || 0) + 1;
  const isLongBreak = newIntervals % prefs.long_break_interval === 0;
  const now = Date.now();

  const breakState = {
    sessionId: null,
    projectId: timerState.projectId,
    phase: isLongBreak ? "longBreak" : "break",
    startedAt: now,
    durationMinutes: isLongBreak ? prefs.long_break_duration : prefs.break_duration,
    isPaused: false,
    pausedAt: null,
    accumulatedPausedMs: 0,
    completedIntervals: newIntervals,
    preferences: prefs,
  };

  await setTimerState(breakState);
  await scheduleCompletionAlarm(breakState);
}

async function handleBreakCompletion() {
  const timerState = await getTimerState();
  if (timerState?.phase !== "break" && timerState?.phase !== "longBreak") {
    return;
  }

  // Play break-complete sound
  await playSound("sounds/bell-notification.wav");

  await clearCompletionAlarm();
  await clearTimerState();
}

// ---------------------------------------------------------------------------
// Abandon
// ---------------------------------------------------------------------------

async function abandonSession() {
  const timerState = await getTimerState();
  if (!timerState?.phase) {
    return null;
  }

  // Only call backend abandon for work sessions with a real backend session
  if (timerState.phase === "work" && timerState.sessionId) {
    await abandonPomodoroSession(timerState.sessionId, {
      actual_duration: calculateActualDurationMinutes(timerState),
      reason: "Abandoned from browser extension",
    });
  }

  await clearCompletionAlarm();
  await clearTimerState();
  return null;
}

// ---------------------------------------------------------------------------
// Notes window
// ---------------------------------------------------------------------------

async function buildNotesWindowUrl(projectId) {
  const frontendBaseUrl = await getFrontendBaseUrl();
  const params = new URLSearchParams();
  if (projectId) {
    params.set("projectId", projectId);
  }
  params.set("source", "extension");
  const query = params.toString();
  return query ? `${frontendBaseUrl}/notes/quick?${query}` : `${frontendBaseUrl}/notes/quick`;
}

async function openNotesWindow(projectId) {
  const notesUrl = await buildNotesWindowUrl(projectId);

  if (notesWindowId) {
    try {
      const tabs = await chrome.tabs.query({ windowId: notesWindowId });
      const firstTabId = tabs[0]?.id;
      if (!firstTabId) {
        throw new Error("No tab available in existing notes window");
      }
      await chrome.tabs.update(firstTabId, { url: notesUrl });
      await chrome.windows.update(notesWindowId, { focused: true });
      return;
    } catch {
      notesWindowId = null;
    }
  }

  const created = await chrome.windows.create({
    url: notesUrl,
    type: "popup",
    width: 460,
    height: 640,
  });

  notesWindowId = created.id ?? null;
}

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === notesWindowId) {
    notesWindowId = null;
  }
});

// ---------------------------------------------------------------------------
// Alarm listener
// ---------------------------------------------------------------------------

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== PHASE_COMPLETION_ALARM) {
    return;
  }

  const timerState = await getTimerState();
  if (!timerState?.phase) {
    return;
  }

  try {
    if (timerState.phase === "work") {
      await handleWorkCompletion();
    } else {
      await handleBreakCompletion();
    }
  } catch {
    // Keep existing state so the user can retry or abandon manually.
  }
});

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Ignore messages intended for the offscreen document
  if (message?.type?.startsWith("offscreen:")) {
    return false;
  }

  const respond = async () => {
    switch (message?.type) {
      case "timer:get-state": {
        const state = await getTimerState();
        return { ok: true, data: state };
      }
      case "timer:sync-active": {
        const state = await syncActiveSessionState();
        return { ok: true, data: state };
      }
      case "timer:start": {
        const state = await startSession(message.projectId);
        return { ok: true, data: state };
      }
      case "timer:pause": {
        const state = await pauseSession();
        return { ok: true, data: state };
      }
      case "timer:resume": {
        const state = await resumeSession();
        return { ok: true, data: state };
      }
      case "timer:abandon": {
        await abandonSession();
        return { ok: true, data: null };
      }
      case "notes:open-window": {
        await openNotesWindow(message.projectId);
        return { ok: true, data: null };
      }
      default:
        return { ok: false, error: "Unknown message type" };
    }
  };

  respond()
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error?.message || "Unexpected extension error",
        status: error?.status || 500,
      });
    });

  return true;
});
