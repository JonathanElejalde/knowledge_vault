import { extensionLogin, extensionLogout, isAuthenticated } from "./lib/auth.js";
import { listLearningProjects, getCurrentUser } from "./lib/api.js";

const elements = {
  authSection: document.getElementById("authSection"),
  appSection: document.getElementById("appSection"),
  loginForm: document.getElementById("loginForm"),
  loginButton: document.getElementById("loginButton"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  userIdentity: document.getElementById("userIdentity"),
  projectSelect: document.getElementById("projectSelect"),
  timerStatus: document.getElementById("timerStatus"),
  timerDisplay: document.getElementById("timerDisplay"),
  feedback: document.getElementById("feedback"),
  startButton: document.getElementById("startButton"),
  stopButton: document.getElementById("stopButton"),
  abandonButton: document.getElementById("abandonButton"),
  openNotesButton: document.getElementById("openNotesButton"),
  logoutButton: document.getElementById("logoutButton"),
};

let activeTimerState = null;
let timerIntervalId = null;
let syncIntervalId = null;

function setFeedback(message) {
  elements.feedback.textContent = message || "";
}

function toggleAuthenticatedView(authenticated) {
  elements.authSection.classList.toggle("hidden", authenticated);
  elements.appSection.classList.toggle("hidden", !authenticated);
}

function formatSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function calculateRemainingSeconds(timerState) {
  if (!timerState?.startedAt || !timerState?.workDurationMinutes) {
    return 0;
  }

  const referenceNow = timerState.isPaused && timerState.pausedAt ? timerState.pausedAt : Date.now();
  const elapsedSeconds = Math.floor(
    (referenceNow - timerState.startedAt - (timerState.accumulatedPausedMs || 0)) / 1000
  );
  const totalSeconds = timerState.workDurationMinutes * 60;
  return Math.max(0, totalSeconds - elapsedSeconds);
}

function updateActionButtons() {
  const hasActiveSession = Boolean(activeTimerState?.sessionId);
  const isPaused = Boolean(activeTimerState?.isPaused);

  if (!hasActiveSession) {
    elements.startButton.textContent = "Start";
  } else if (isPaused) {
    elements.startButton.textContent = "Resume";
  } else {
    elements.startButton.textContent = "Running";
  }

  elements.startButton.disabled = hasActiveSession && !isPaused;
  elements.stopButton.disabled = !hasActiveSession || isPaused;
  elements.abandonButton.disabled = !hasActiveSession;
}

function renderTimer() {
  if (!activeTimerState?.sessionId) {
    elements.timerStatus.textContent = "No active session";
    elements.timerDisplay.textContent = "25:00";
    updateActionButtons();
    return;
  }

  const remainingSeconds = calculateRemainingSeconds(activeTimerState);
  if (activeTimerState.isPaused) {
    elements.timerStatus.textContent = "Session paused";
  } else if (remainingSeconds <= 0) {
    elements.timerStatus.textContent = "Session elapsed. Completing...";
  } else {
    elements.timerStatus.textContent = "Work session running";
  }
  elements.timerDisplay.textContent = formatSeconds(remainingSeconds);
  updateActionButtons();
}

function startTimerRendering() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
  }
  timerIntervalId = window.setInterval(renderTimer, 1000);
  renderTimer();

  if (syncIntervalId) {
    window.clearInterval(syncIntervalId);
  }
  syncIntervalId = window.setInterval(async () => {
    try {
      await syncTimerState();
    } catch {
      // Ignore intermittent sync errors; user actions can still retry explicitly.
    }
  }, 15000);
}

function stopTimerRendering() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  if (syncIntervalId) {
    window.clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

async function sendRuntimeMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "Extension action failed");
  }
  return response.data;
}

async function syncTimerState() {
  activeTimerState = await sendRuntimeMessage({ type: "timer:sync-active" });
  if (activeTimerState?.projectId) {
    elements.projectSelect.value = activeTimerState.projectId;
  }
  renderTimer();
}

async function loadProjects() {
  const activeProjects = await listLearningProjects({ status: "in_progress" });

  const previousValue = elements.projectSelect.value;
  elements.projectSelect.innerHTML = '<option value="">No project</option>';

  activeProjects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    elements.projectSelect.appendChild(option);
  });

  if (previousValue && activeProjects.some((project) => project.id === previousValue)) {
    elements.projectSelect.value = previousValue;
  }
}

async function initializeAuthenticatedView() {
  const user = await getCurrentUser();
  elements.userIdentity.textContent = `${user.username} (${user.email})`;
  toggleAuthenticatedView(true);
  await loadProjects();
  await syncTimerState();
  startTimerRendering();
}

async function bootstrap() {
  setFeedback("");

  if (!(await isAuthenticated())) {
    toggleAuthenticatedView(false);
    updateActionButtons();
    return;
  }

  try {
    await initializeAuthenticatedView();
  } catch (error) {
    await extensionLogout();
    toggleAuthenticatedView(false);
    setFeedback(error?.message || "Session expired. Please sign in again.");
  }
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFeedback("");
  elements.loginButton.disabled = true;

  try {
    await extensionLogin(elements.email.value.trim(), elements.password.value);
    elements.password.value = "";
    await initializeAuthenticatedView();
  } catch (error) {
    setFeedback(error?.message || "Failed to log in");
    toggleAuthenticatedView(false);
  } finally {
    elements.loginButton.disabled = false;
  }
});

elements.startButton.addEventListener("click", async () => {
  setFeedback("");
  try {
    activeTimerState = await sendRuntimeMessage({
      type: "timer:start",
      projectId: elements.projectSelect.value || null,
    });
    renderTimer();
  } catch (error) {
    setFeedback(error?.message || "Failed to start session");
  }
});

elements.stopButton.addEventListener("click", async () => {
  setFeedback("");
  try {
    activeTimerState = await sendRuntimeMessage({ type: "timer:pause" });
    renderTimer();
  } catch (error) {
    setFeedback(error?.message || "Failed to stop timer");
  }
});

elements.abandonButton.addEventListener("click", async () => {
  setFeedback("");
  try {
    await sendRuntimeMessage({ type: "timer:abandon" });
    activeTimerState = null;
    renderTimer();
  } catch (error) {
    setFeedback(error?.message || "Failed to abandon session");
  }
});

elements.openNotesButton.addEventListener("click", async () => {
  setFeedback("");
  try {
    await sendRuntimeMessage({
      type: "notes:open-window",
      projectId: activeTimerState?.projectId || elements.projectSelect.value || null,
    });
  } catch (error) {
    setFeedback(error?.message || "Failed to open quick notes");
  }
});

elements.logoutButton.addEventListener("click", async () => {
  await extensionLogout();
  activeTimerState = null;
  stopTimerRendering();
  toggleAuthenticatedView(false);
  setFeedback("Logged out");
  updateActionButtons();
});

window.addEventListener("beforeunload", () => {
  stopTimerRendering();
});

bootstrap();
