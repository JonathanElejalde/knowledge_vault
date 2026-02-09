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
const SESSION_COMPLETION_ALARM = "kv_extension_session_completion";
let notesWindowId = null;

function toTimerState(session) {
  return {
    sessionId: session.id,
    projectId: session.learning_project_id ?? null,
    startedAt: new Date(session.start_time).getTime(),
    workDurationMinutes: session.work_duration,
    status: session.status,
    isPaused: false,
    pausedAt: null,
    accumulatedPausedMs: 0,
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

function getSessionEndTimestamp(timerState) {
  if (!timerState?.startedAt || !timerState?.workDurationMinutes) {
    return null;
  }

  const durationMs = timerState.workDurationMinutes * 60 * 1000;
  return timerState.startedAt + durationMs + (timerState.accumulatedPausedMs || 0);
}

async function scheduleCompletionAlarm(timerState) {
  if (!timerState?.sessionId || timerState.isPaused) {
    await chrome.alarms.clear(SESSION_COMPLETION_ALARM);
    return;
  }

  const endTimestamp = getSessionEndTimestamp(timerState);
  if (!endTimestamp) {
    return;
  }

  await chrome.alarms.create(SESSION_COMPLETION_ALARM, { when: endTimestamp });
}

async function clearCompletionAlarm() {
  await chrome.alarms.clear(SESSION_COMPLETION_ALARM);
}

async function syncActiveSessionState() {
  const localState = await getTimerState();
  const activeSession = await getActiveSession();
  if (!activeSession) {
    await clearCompletionAlarm();
    await clearTimerState();
    return null;
  }

  const state = toTimerState(activeSession);
  if (localState?.sessionId === state.sessionId) {
    state.accumulatedPausedMs = localState.accumulatedPausedMs || 0;
    state.isPaused = Boolean(localState.isPaused);
    state.pausedAt = localState.pausedAt || null;
  }

  await setTimerState(state);
  await scheduleCompletionAlarm(state);
  return state;
}

async function startSession(projectId) {
  const existingState = await syncActiveSessionState();
  if (existingState?.sessionId) {
    if (!existingState.isPaused) {
      return existingState;
    }

    const resumedState = await resumeSession(existingState);
    return resumedState;
  }

  const preferences = await getPomodoroPreferences();

  const sessionPayload = {
    learning_project_id: projectId || undefined,
    session_type: "work",
    work_duration: preferences.work_duration,
    break_duration: preferences.break_duration,
  };

  const session = await startPomodoroSession(sessionPayload);
  const timerState = toTimerState(session);
  await setTimerState(timerState);
  await scheduleCompletionAlarm(timerState);
  return timerState;
}

async function pauseSession() {
  const timerState = (await getTimerState()) ?? (await syncActiveSessionState());
  if (!timerState?.sessionId) {
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
  const timerState = stateArg ?? (await getTimerState()) ?? (await syncActiveSessionState());
  if (!timerState?.sessionId) {
    return null;
  }
  if (!timerState.isPaused || !timerState.pausedAt) {
    await scheduleCompletionAlarm(timerState);
    return timerState;
  }

  const resumedState = {
    ...timerState,
    isPaused: false,
    accumulatedPausedMs: (timerState.accumulatedPausedMs || 0) + Math.max(0, Date.now() - timerState.pausedAt),
    pausedAt: null,
  };

  await setTimerState(resumedState);
  await scheduleCompletionAlarm(resumedState);
  return resumedState;
}

async function completeSession() {
  const timerState = (await getTimerState()) ?? (await syncActiveSessionState());
  if (!timerState?.sessionId) {
    return null;
  }

  await completePomodoroSession(timerState.sessionId, {
    actual_duration: calculateActualDurationMinutes(timerState),
  });

  await clearCompletionAlarm();
  await clearTimerState();
  return null;
}

async function abandonSession() {
  const timerState = (await getTimerState()) ?? (await syncActiveSessionState());
  if (!timerState?.sessionId) {
    return null;
  }

  await abandonPomodoroSession(timerState.sessionId, {
    actual_duration: calculateActualDurationMinutes(timerState),
    reason: "Abandoned from browser extension",
  });

  await clearCompletionAlarm();
  await clearTimerState();
  return null;
}

async function buildNotesWindowUrl(projectId) {
  const frontendBaseUrl = await getFrontendBaseUrl();
  const params = new URLSearchParams();
  if (projectId) {
    params.set("projectId", projectId);
  }
  params.set("source", "extension");
  const query = params.toString();
  return query ? `${frontendBaseUrl}/notes/new?${query}` : `${frontendBaseUrl}/notes/new`;
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
    width: 1280,
    height: 840,
  });

  notesWindowId = created.id ?? null;
}

function configureSidePanelBehavior() {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanelBehavior();
});

chrome.runtime.onStartup.addListener(() => {
  configureSidePanelBehavior();
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === notesWindowId) {
    notesWindowId = null;
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SESSION_COMPLETION_ALARM) {
    completeSession().catch(() => {
      // Keep the existing session state if completion fails, so user can retry.
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
      case "timer:complete": {
        await completeSession();
        return { ok: true, data: null };
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
