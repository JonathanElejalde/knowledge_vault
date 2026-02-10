import { extensionLogin, extensionLogout, isAuthenticated } from "./lib/auth.js";
import { listLearningProjects, getCurrentUser } from "./lib/api.js";

const ABANDON_CONFIRM_WINDOW_MS = 4000;
const DEFAULT_TIMER_DISPLAY = "25:00";

const elements = {
  authSection: document.getElementById("authSection"),
  appSection: document.getElementById("appSection"),
  loginForm: document.getElementById("loginForm"),
  loginButton: document.getElementById("loginButton"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  userIdentity: document.getElementById("userIdentity"),
  miniPlayer: document.getElementById("miniPlayer"),
  primaryButton: document.getElementById("primaryButton"),
  timerStateBadge: document.getElementById("timerStateBadge"),
  timerDisplay: document.getElementById("timerDisplay"),
  openNotesButton: document.getElementById("openNotesButton"),
  projectTrigger: document.getElementById("projectTrigger"),
  projectDropdown: document.getElementById("projectDropdown"),
  projectSearch: document.getElementById("projectSearch"),
  projectOptions: document.getElementById("projectOptions"),
  projectHint: document.getElementById("projectHint"),
  abandonButton: document.getElementById("abandonButton"),
  logoutButton: document.getElementById("logoutButton"),
  feedback: document.getElementById("feedback"),
};

let activeTimerState = null;
let selectedProjectId = null;
let availableProjects = [];
let timerIntervalId = null;
let abandonDeadlineMs = 0;
let abandonResetTimeoutId = null;
let themeMediaQuery = null;
let themeMediaListener = null;

function setFeedback(message) {
  elements.feedback.textContent = message || "";
}

function toSafeErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function toggleAuthenticatedView(authenticated) {
  elements.authSection.classList.toggle("hidden", authenticated);
  elements.appSection.classList.toggle("hidden", !authenticated);
}

function applyThemeMode(isDark) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(isDark ? "dark" : "light");
}

function initializeTheme() {
  const root = document.documentElement;
  root.classList.add("theme-calm");

  if (!window.matchMedia) {
    applyThemeMode(false);
    return;
  }

  themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  applyThemeMode(themeMediaQuery.matches);

  themeMediaListener = (event) => {
    applyThemeMode(event.matches);
  };

  if (themeMediaQuery.addEventListener) {
    themeMediaQuery.addEventListener("change", themeMediaListener);
  } else if (themeMediaQuery.addListener) {
    themeMediaQuery.addListener(themeMediaListener);
  }
}

function cleanupThemeListener() {
  if (!themeMediaQuery || !themeMediaListener) {
    return;
  }
  if (themeMediaQuery.removeEventListener) {
    themeMediaQuery.removeEventListener("change", themeMediaListener);
  } else if (themeMediaQuery.removeListener) {
    themeMediaQuery.removeListener(themeMediaListener);
  }
  themeMediaQuery = null;
  themeMediaListener = null;
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

function normalizeSessionType(timerState) {
  return String(timerState?.sessionType || "work").toLowerCase();
}

function getTimerLabel(timerState, remainingSeconds) {
  if (!timerState?.sessionId) {
    return { label: "Idle", className: "state-idle" };
  }
  if (timerState.isPaused) {
    return { label: "Paused", className: "state-paused" };
  }
  const sessionType = normalizeSessionType(timerState);
  if (sessionType.includes("break")) {
    return { label: "Break", className: "state-break" };
  }
  if (remainingSeconds <= 0) {
    return { label: "Completing", className: "state-running" };
  }
  return { label: "Running", className: "state-running" };
}

function getProjectLabel(projectId) {
  if (!projectId) {
    return "No project";
  }
  const project = availableProjects.find((item) => item.id === projectId);
  if (project?.name) {
    return project.name;
  }
  return `Project ${projectId}`;
}

function setProjectHint() {
  if (!activeTimerState?.sessionId) {
    elements.projectHint.textContent = "Project is optional when starting a session.";
    return;
  }
  const label = getProjectLabel(activeTimerState.projectId);
  elements.projectHint.textContent = `Active session project: ${label}`;
}

function updatePrimaryButton() {
  const hasActiveSession = Boolean(activeTimerState?.sessionId);
  const isPaused = Boolean(activeTimerState?.isPaused);

  if (!hasActiveSession) {
    elements.primaryButton.dataset.mode = "start";
    elements.primaryButton.textContent = "Start";
  } else if (isPaused) {
    elements.primaryButton.dataset.mode = "resume";
    elements.primaryButton.textContent = "Resume";
  } else {
    elements.primaryButton.dataset.mode = "pause";
    elements.primaryButton.textContent = "Pause";
  }
}

function setAbandonConfirmState(enabled) {
  if (enabled) {
    elements.abandonButton.classList.add("is-confirming");
    elements.abandonButton.textContent = "Confirm Abandon";
    return;
  }
  elements.abandonButton.classList.remove("is-confirming");
  elements.abandonButton.textContent = "Abandon";
}

function resetAbandonConfirmation() {
  abandonDeadlineMs = 0;
  if (abandonResetTimeoutId) {
    window.clearTimeout(abandonResetTimeoutId);
    abandonResetTimeoutId = null;
  }
  setAbandonConfirmState(false);
}

function renderProjectTrigger() {
  elements.projectTrigger.textContent = getProjectLabel(selectedProjectId);
}

function renderProjectOptions(filterText = "") {
  const query = filterText.trim().toLowerCase();
  elements.projectOptions.innerHTML = "";

  const createOption = (value, label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-option";
    if ((value || null) === (selectedProjectId || null)) {
      button.classList.add("is-selected");
    }
    button.textContent = label;
    button.dataset.value = value || "";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String((value || null) === (selectedProjectId || null)));
    button.addEventListener("click", () => {
      selectedProjectId = value || null;
      renderProjectTrigger();
      setProjectHint();
      closeProjectDropdown();
    });
    return button;
  };

  elements.projectOptions.appendChild(createOption("", "No project"));

  const filteredProjects = availableProjects.filter((project) => {
    if (!query) {
      return true;
    }
    return project.name.toLowerCase().includes(query);
  });

  filteredProjects.forEach((project) => {
    elements.projectOptions.appendChild(createOption(project.id, project.name));
  });

  if (!filteredProjects.length) {
    const emptyText = document.createElement("p");
    emptyText.className = "project-empty";
    emptyText.textContent = "No projects match your search.";
    elements.projectOptions.appendChild(emptyText);
  }
}

function openProjectDropdown() {
  if (elements.projectTrigger.disabled) {
    return;
  }
  elements.projectDropdown.classList.remove("hidden");
  elements.projectTrigger.setAttribute("aria-expanded", "true");
  renderProjectOptions(elements.projectSearch.value);
  elements.projectSearch.focus();
}

function closeProjectDropdown() {
  elements.projectDropdown.classList.add("hidden");
  elements.projectTrigger.setAttribute("aria-expanded", "false");
  elements.projectSearch.value = "";
}

function renderTimer() {
  const remainingSeconds = calculateRemainingSeconds(activeTimerState);
  const { label, className } = getTimerLabel(activeTimerState, remainingSeconds);

  elements.timerStateBadge.className = `state-badge ${className}`;
  elements.timerStateBadge.textContent = label;

  if (!activeTimerState?.sessionId) {
    elements.timerDisplay.textContent = DEFAULT_TIMER_DISPLAY;
  } else {
    elements.timerDisplay.textContent = formatSeconds(remainingSeconds);
  }

  const hasActiveSession = Boolean(activeTimerState?.sessionId);
  let visualState = "idle";
  if (hasActiveSession && activeTimerState?.isPaused) {
    visualState = "paused";
  } else if (hasActiveSession && normalizeSessionType(activeTimerState).includes("break")) {
    visualState = "break";
  } else if (hasActiveSession) {
    visualState = "running";
  }

  elements.miniPlayer.dataset.state = visualState;
  elements.abandonButton.disabled = !hasActiveSession;
  elements.projectTrigger.disabled = hasActiveSession;
  updatePrimaryButton();
  setProjectHint();
}

function startTimerRendering() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
  }
  timerIntervalId = window.setInterval(renderTimer, 1000);
  renderTimer();
}

function stopTimerRendering() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
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
    selectedProjectId = activeTimerState.projectId;
  }
  renderProjectTrigger();
  renderTimer();
}

function ensureSessionProjectInOptions() {
  if (!activeTimerState?.projectId) {
    return;
  }
  const exists = availableProjects.some((project) => project.id === activeTimerState.projectId);
  if (exists) {
    return;
  }
  availableProjects = [
    {
      id: activeTimerState.projectId,
      name: `Active project (${activeTimerState.projectId})`,
    },
    ...availableProjects,
  ];
}

async function loadProjects() {
  const projects = await listLearningProjects({ status: "in_progress" });
  availableProjects = Array.isArray(projects) ? projects : [];
  ensureSessionProjectInOptions();

  if (activeTimerState?.projectId) {
    selectedProjectId = activeTimerState.projectId;
  } else if (
    selectedProjectId &&
    !availableProjects.some((project) => project.id === selectedProjectId)
  ) {
    selectedProjectId = null;
  }

  renderProjectTrigger();
  renderProjectOptions();
  setProjectHint();
}

function attachProjectDropdownEvents() {
  elements.projectTrigger.addEventListener("click", () => {
    const isOpen = !elements.projectDropdown.classList.contains("hidden");
    if (isOpen) {
      closeProjectDropdown();
    } else {
      openProjectDropdown();
    }
  });

  elements.projectSearch.addEventListener("input", () => {
    renderProjectOptions(elements.projectSearch.value);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    const comboboxContainer = document.getElementById("projectCombobox");
    if (!comboboxContainer?.contains(target)) {
      closeProjectDropdown();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProjectDropdown();
      resetAbandonConfirmation();
    }
  });
}

async function initializeAuthenticatedView() {
  const user = await getCurrentUser();
  const userDisplay = user.username || user.email || "Signed in";
  elements.userIdentity.textContent = userDisplay;

  toggleAuthenticatedView(true);
  await syncTimerState();
  await loadProjects();
  startTimerRendering();
}

async function bootstrap() {
  initializeTheme();
  closeProjectDropdown();
  setFeedback("");
  updatePrimaryButton();

  if (!(await isAuthenticated())) {
    toggleAuthenticatedView(false);
    return;
  }

  try {
    await initializeAuthenticatedView();
  } catch (error) {
    await extensionLogout();
    toggleAuthenticatedView(false);
    setFeedback(toSafeErrorMessage(error, "Session expired. Please sign in again."));
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
    toggleAuthenticatedView(false);
    setFeedback(toSafeErrorMessage(error, "Failed to log in."));
  } finally {
    elements.loginButton.disabled = false;
  }
});

elements.primaryButton.addEventListener("click", async () => {
  setFeedback("");
  resetAbandonConfirmation();

  try {
    if (!activeTimerState?.sessionId || activeTimerState.isPaused) {
      activeTimerState = await sendRuntimeMessage({
        type: "timer:start",
        projectId: activeTimerState?.projectId || selectedProjectId || null,
      });
    } else {
      activeTimerState = await sendRuntimeMessage({ type: "timer:pause" });
    }
    renderTimer();
  } catch (error) {
    setFeedback(toSafeErrorMessage(error, "Failed to change timer state."));
  }
});

elements.abandonButton.addEventListener("click", async () => {
  setFeedback("");

  if (!activeTimerState?.sessionId) {
    return;
  }

  const now = Date.now();
  if (now > abandonDeadlineMs) {
    abandonDeadlineMs = now + ABANDON_CONFIRM_WINDOW_MS;
    setAbandonConfirmState(true);
    setFeedback("Click again within 4 seconds to confirm abandon.");

    if (abandonResetTimeoutId) {
      window.clearTimeout(abandonResetTimeoutId);
    }
    abandonResetTimeoutId = window.setTimeout(() => {
      resetAbandonConfirmation();
      setFeedback("");
    }, ABANDON_CONFIRM_WINDOW_MS);
    return;
  }

  try {
    await sendRuntimeMessage({ type: "timer:abandon" });
    activeTimerState = null;
    resetAbandonConfirmation();
    renderTimer();
    setFeedback("Session abandoned.");
  } catch (error) {
    resetAbandonConfirmation();
    setFeedback(toSafeErrorMessage(error, "Failed to abandon session."));
  }
});

elements.openNotesButton.addEventListener("click", async () => {
  setFeedback("");

  try {
    await sendRuntimeMessage({
      type: "notes:open-window",
      projectId: activeTimerState?.projectId || selectedProjectId || null,
    });
  } catch (error) {
    setFeedback(toSafeErrorMessage(error, "Failed to open quick notes."));
  }
});

elements.logoutButton.addEventListener("click", async () => {
  setFeedback("");
  resetAbandonConfirmation();

  await extensionLogout();
  activeTimerState = null;
  selectedProjectId = null;
  availableProjects = [];

  stopTimerRendering();
  closeProjectDropdown();
  toggleAuthenticatedView(false);
  renderProjectTrigger();
  renderTimer();
  setFeedback("Logged out.");
});

window.addEventListener("beforeunload", () => {
  stopTimerRendering();
  resetAbandonConfirmation();
  cleanupThemeListener();
});

attachProjectDropdownEvents();
bootstrap();
