/**
 * TimeUp - Card Button UI
 * DOM manipulation for the timer popup view
 */

import { TIMER_STATE } from "../utils/constants.js";
import {
  formatDuration,
  sumDurations,
  getRemainingTime,
  parseTimeString,
} from "../utils/formatTime.js";
import StorageService from "../services/StorageService.js";
import TimerService from "../services/TimerService.js";

// DOM Elements
const timerDisplay = document.getElementById("timer-display");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const entriesList = document.getElementById("entries-list");
const totalTime = document.getElementById("total-time");
const totalValue = document.getElementById("total-value");
const estimateInput = document.getElementById("estimate-input");
const btnSetEstimate = document.getElementById("btn-set-estimate");
const btnClearEstimate = document.getElementById("btn-clear-estimate");
const estimateDisplay = document.getElementById("estimate-display");
const remainingText = document.getElementById("remaining-text");

let updateInterval = null;

/**
 * Escapes HTML to prevent XSS attacks.
 * @param {string} str - The string to escape
 * @returns {string} Escaped string
 */
const escapeHtml = (str) => {
  if (!str) return "";
  return String(str).replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
};

/**
 * Updates the timer display with current elapsed time.
 * @param {Object} timerData - Current timer data
 */
const updateDisplay = (timerData) => {
  const elapsed = TimerService.getCurrentElapsed(timerData);
  timerDisplay.textContent = formatDuration(elapsed);

  const isRunning = timerData.state === TIMER_STATE.RUNNING;
  timerDisplay.classList.toggle("timer__display--running", isRunning);
  btnStart.hidden = isRunning;
  btnStop.hidden = !isRunning;
};

/**
 * Updates the estimate UI elements.
 * @param {Object} timerData - Current timer data
 */
const updateEstimateUI = (timerData) => {
  const hasEstimate = timerData.estimatedTime && timerData.estimatedTime > 0;

  if (hasEstimate) {
    estimateInput.hidden = true;
    btnSetEstimate.hidden = true;
    estimateDisplay.hidden = false;
    estimateDisplay.textContent = formatDuration(timerData.estimatedTime, {
      compact: true,
      showSeconds: false,
    });
    btnClearEstimate.hidden = false;

    // Show remaining time
    const remainingInfo = getRemainingTime(
      timerData.entries,
      timerData.estimatedTime,
    );
    if (remainingInfo) {
      remainingText.hidden = false;
      remainingText.className = "remaining-text";

      if (remainingInfo.isOverBudget) {
        remainingText.classList.add("remaining-text--over");
        remainingText.textContent = `${formatDuration(Math.abs(remainingInfo.remaining), { compact: true, showSeconds: false })} over`;
      } else if (remainingInfo.percentComplete >= 80) {
        remainingText.classList.add("remaining-text--warning");
        remainingText.textContent = `${formatDuration(remainingInfo.remaining, { compact: true, showSeconds: false })} left`;
      } else {
        remainingText.classList.add("remaining-text--normal");
        remainingText.textContent = `${formatDuration(remainingInfo.remaining, { compact: true, showSeconds: false })} left`;
      }
    }
  } else {
    estimateInput.hidden = false;
    btnSetEstimate.hidden = false;
    estimateDisplay.hidden = true;
    btnClearEstimate.hidden = true;
    remainingText.hidden = true;
  }
};

/**
 * Handles deleting a time entry.
 * @param {string} entryId - ID of entry to delete
 */
const handleDeleteEntry = async (entryId) => {
  if (!confirm("Delete this time entry?")) return;
  const result = await TimerService.deleteEntry(t, entryId);
  if (result.success) {
    renderEntries(result.data.entries);
    updateEstimateUI(result.data);
  }
};

/**
 * Renders the list of time entries.
 * @param {Array} entries - Time entries
 */
const renderEntries = (entries) => {
  if (!entries.length) {
    entriesList.innerHTML =
      '<p class="empty-state__description">No entries yet</p>';
    totalTime.hidden = true;
    return;
  }

  entriesList.innerHTML = entries
    .map(
      (entry) => `
    <div class="timer__entry">
      <div class="timer__entry-left">
        <span class="timer__entry-time">${escapeHtml(new Date(entry.startTime).toLocaleTimeString())}</span>
        ${entry.description ? `<span class="timer__entry-description">${escapeHtml(entry.description)}</span>` : ""}
      </div>
      <div class="timer__entry-right">
        <span class="timer__entry-duration">${escapeHtml(formatDuration(entry.duration, { compact: true }))}</span>
        <button class="btn-delete-entry" data-id="${escapeHtml(entry.id)}" title="Delete entry">×</button>
      </div>
    </div>
  `,
    )
    .join("");

  // Attach delete handlers
  entriesList.querySelectorAll(".btn-delete-entry").forEach((btn) => {
    btn.addEventListener("click", () => handleDeleteEntry(btn.dataset.id));
  });

  const total = sumDurations(entries);
  totalValue.textContent = formatDuration(total, { compact: true });
  totalTime.hidden = false;
};

/**
 * Initializes the UI with current data.
 * @param {Object} t - Trello client
 */
const init = async (t) => {
  try {
    const timerData = await StorageService.getTimerData(t);
    updateDisplay(timerData);
    renderEntries(timerData.entries);
    updateEstimateUI(timerData);

    if (timerData.state === TIMER_STATE.RUNNING) {
      startUpdateLoop(t);
    }
  } catch (error) {
    console.error("[CardButtonUI] init error:", error);
  }
};

/**
 * Starts the display update loop.
 * @param {Object} t - Trello client
 */
const startUpdateLoop = (t) => {
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(async () => {
    const timerData = await StorageService.getTimerData(t);
    updateDisplay(timerData);
    updateEstimateUI(timerData);
  }, 1000);
};

/**
 * Stops the update loop.
 */
const stopUpdateLoop = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
};

// Initialize when Trello iframe is ready
/* global TrelloPowerUp */
const t = TrelloPowerUp.iframe();

t.render(() => init(t));

// Event Listeners
btnStart.addEventListener("click", async () => {
  const result = await TimerService.startTimer(t);
  if (result.success) {
    updateDisplay(result.data);
    startUpdateLoop(t);
  }
});

btnStop.addEventListener("click", async () => {
  stopUpdateLoop();
  const result = await TimerService.stopTimer(t);
  if (result.success) {
    updateDisplay(result.data);
    renderEntries(result.data.entries);
    updateEstimateUI(result.data);
  }
});

btnSetEstimate.addEventListener("click", async () => {
  const value = estimateInput.value.trim();
  const ms = parseTimeString(value);
  if (ms) {
    const result = await TimerService.setEstimate(t, ms);
    if (result.success) {
      estimateInput.value = "";
      updateEstimateUI(result.data);
    }
  } else {
    alert("Invalid time format. Try: 2h 30m, 1.5h, or 90 (minutes)");
  }
});

estimateInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    btnSetEstimate.click();
  }
});

btnClearEstimate.addEventListener("click", async () => {
  const result = await TimerService.setEstimate(t, null);
  if (result.success) {
    updateEstimateUI(result.data);
  }
});
