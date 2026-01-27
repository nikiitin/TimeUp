/**
 * TimeUp - Timer Service
 * Business logic for timer operations
 */

import { TIMER_STATE, DEFAULTS } from '../utils/constants.js';
import { getElapsedTime } from '../utils/formatTime.js';
import StorageService from './StorageService.js';

/**
 * Creates a new time entry.
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp
 * @param {string} [description=''] - Description
 * @returns {Object} Time entry
 */
const createEntry = (startTime, endTime, description = '') => ({
    id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime,
    endTime,
    duration: endTime - startTime,
    description,
    createdAt: Date.now(),
});

/**
 * Validates timer data structure.
 * @param {Object} data - Timer data
 * @returns {Object} Validated timer data
 */
const validateTimerData = (data) => ({
    entries: Array.isArray(data?.entries) ? data.entries : [],
    state: Object.values(TIMER_STATE).includes(data?.state) ? data.state : TIMER_STATE.IDLE,
    currentEntry: data?.currentEntry ?? null,
});

/**
 * Starts the timer.
 * @param {Object} t - Trello client
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const startTimer = async (t) => {
    try {
        const timerData = validateTimerData(await StorageService.getTimerData(t));
        if (timerData.state === TIMER_STATE.RUNNING) {
            return { success: false, error: 'Timer already running', data: timerData };
        }
        const updatedData = {
            ...timerData,
            state: TIMER_STATE.RUNNING,
            currentEntry: { startTime: Date.now(), pausedDuration: 0 },
        };
        const saved = await StorageService.setTimerData(t, updatedData);
        return saved ? { success: true, data: updatedData } : { success: false, error: 'Save failed' };
    } catch (error) {
        console.error('[TimerService] startTimer error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Stops the timer and saves entry.
 * @param {Object} t - Trello client
 * @param {string} [description=''] - Entry description
 * @returns {Promise<{success: boolean, data?: Object, entry?: Object, error?: string}>}
 */
export const stopTimer = async (t, description = '') => {
    try {
        const timerData = validateTimerData(await StorageService.getTimerData(t));
        if (timerData.state === TIMER_STATE.IDLE || !timerData.currentEntry) {
            return { success: false, error: 'No active timer', data: timerData };
        }
        const now = Date.now();
        const { startTime, pausedDuration = 0 } = timerData.currentEntry;
        const newEntry = createEntry(startTime, now, description);
        newEntry.duration = now - startTime - pausedDuration;
        const updatedData = { entries: [...timerData.entries, newEntry], state: TIMER_STATE.IDLE, currentEntry: null };
        const saved = await StorageService.setTimerData(t, updatedData);
        return saved ? { success: true, data: updatedData, entry: newEntry } : { success: false, error: 'Save failed' };
    } catch (error) {
        console.error('[TimerService] stopTimer error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Gets current elapsed time.
 * @param {Object} timerData - Timer data
 * @returns {number} Elapsed ms
 */
export const getCurrentElapsed = (timerData) => {
    if (!timerData?.currentEntry) return 0;
    const { startTime, pausedDuration = 0 } = timerData.currentEntry;
    if (timerData.state === TIMER_STATE.RUNNING) return getElapsedTime(startTime) - pausedDuration;
    return timerData.currentEntry.elapsedBeforePause ?? 0;
};

const TimerService = { startTimer, stopTimer, getCurrentElapsed };
export default TimerService;
