/**
 * TimeUp - Card Button UI
 * DOM manipulation for the timer popup view
 */

import { TIMER_STATE } from '../utils/constants.js';
import { formatDuration, sumDurations } from '../utils/formatTime.js';
import StorageService from '../services/StorageService.js';
import TimerService from '../services/TimerService.js';

// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const entriesList = document.getElementById('entries-list');
const totalTime = document.getElementById('total-time');
const totalValue = document.getElementById('total-value');

let updateInterval = null;

/**
 * Updates the timer display with current elapsed time.
 * @param {Object} timerData - Current timer data
 */
const updateDisplay = (timerData) => {
    const elapsed = TimerService.getCurrentElapsed(timerData);
    timerDisplay.textContent = formatDuration(elapsed);

    const isRunning = timerData.state === TIMER_STATE.RUNNING;
    timerDisplay.classList.toggle('timer__display--running', isRunning);
    btnStart.hidden = isRunning;
    btnStop.hidden = !isRunning;
};

/**
 * Renders the list of time entries.
 * @param {Array} entries - Time entries
 */
const renderEntries = (entries) => {
    if (!entries.length) {
        entriesList.innerHTML = '<p class="empty-state__description">No entries yet</p>';
        totalTime.hidden = true;
        return;
    }

    entriesList.innerHTML = entries.map((entry) => `
    <div class="timer__entry">
      <span class="timer__entry-time">${new Date(entry.startTime).toLocaleTimeString()}</span>
      <span class="timer__entry-duration">${formatDuration(entry.duration, { compact: true })}</span>
    </div>
  `).join('');

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

        if (timerData.state === TIMER_STATE.RUNNING) {
            startUpdateLoop(t);
        }
    } catch (error) {
        console.error('[CardButtonUI] init error:', error);
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
btnStart.addEventListener('click', async () => {
    const result = await TimerService.startTimer(t);
    if (result.success) {
        updateDisplay(result.data);
        startUpdateLoop(t);
    }
});

btnStop.addEventListener('click', async () => {
    stopUpdateLoop();
    const result = await TimerService.stopTimer(t);
    if (result.success) {
        updateDisplay(result.data);
        renderEntries(result.data.entries);
    }
});
