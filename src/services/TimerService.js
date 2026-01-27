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
    estimatedTime: typeof data?.estimatedTime === 'number' ? data.estimatedTime : null,
    manualEstimateSet: data?.manualEstimateSet ?? false,
    checklistItems: data?.checklistItems ?? {},
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

/**
 * Sets the time estimate for a card (manual override).
 * @param {Object} t - Trello client
 * @param {number|null} estimatedTimeMs - Estimated time in milliseconds, or null to clear
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const setEstimate = async (t, estimatedTimeMs) => {
    try {
        const timerData = validateTimerData(await StorageService.getTimerData(t));
        const updatedData = {
            ...timerData,
            estimatedTime: estimatedTimeMs,
            // If setting a value, mark as manual. If clearing (null), revert to calculated.
            manualEstimateSet: estimatedTimeMs !== null && estimatedTimeMs > 0,
        };
        const saved = await StorageService.setTimerData(t, updatedData);
        return saved ? { success: true, data: updatedData } : { success: false, error: 'Save failed' };
    } catch (error) {
        console.error('[TimerService] setEstimate error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Deletes a time entry by ID.
 * @param {Object} t - Trello client
 * @param {string} entryId - ID of the entry to delete
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const deleteEntry = async (t, entryId) => {
    try {
        const timerData = validateTimerData(await StorageService.getTimerData(t));
        const entryIndex = timerData.entries.findIndex(e => e.id === entryId);

        if (entryIndex === -1) {
            return { success: false, error: 'Entry not found', data: timerData };
        }

        const updatedData = {
            ...timerData,
            entries: timerData.entries.filter(e => e.id !== entryId),
        };
        const saved = await StorageService.setTimerData(t, updatedData);
        return saved ? { success: true, data: updatedData } : { success: false, error: 'Save failed' };
    } catch (error) {
        console.error('[TimerService] deleteEntry error:', error);
        return { success: false, error: error.message };
    }
};
// =============================================================================
// CHECKLIST ITEM TIMER OPERATIONS
// =============================================================================

/**
 * Gets or initializes checklist item data.
 * @param {Object} checklistItems - Current checklistItems map
 * @param {string} itemId - Checklist item ID
 * @returns {Object} Checklist item data
 */
const getOrInitItemData = (checklistItems, itemId) => {
    return checklistItems[itemId] || {
        entries: [],
        state: TIMER_STATE.IDLE,
        currentEntry: null,
        estimatedTime: null,
    };
};

/**
 * Starts timer for a specific checklist item.
 * @param {Object} t - Trello client
 * @param {string} checkItemId - Checklist item ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const startItemTimer = async (t, checkItemId) => {
    try {
        const timerData = validateTimerData(await StorageService.getTimerData(t));

        // Check if any item already has a running timer
        for (const [id, item] of Object.entries(timerData.checklistItems)) {
            if (item.state === TIMER_STATE.RUNNING) {
                return { success: false, error: `Item already running: ${id}`, data: timerData };
            }
        }

        // Also check if card-level timer is running
        if (timerData.state === TIMER_STATE.RUNNING) {
            return { success: false, error: 'Card timer already running', data: timerData };
        }

        const itemData = getOrInitItemData(timerData.checklistItems, checkItemId);

        const updatedData = {
            ...timerData,
            checklistItems: {
                ...timerData.checklistItems,
                [checkItemId]: {
                    ...itemData,
                    state: TIMER_STATE.RUNNING,
                    currentEntry: { startTime: Date.now(), pausedDuration: 0 },
                },
            },
        };

        const saved = await StorageService.setTimerData(t, updatedData);
        return saved ? { success: true, data: updatedData } : { success: false, error: 'Save failed' };
    } catch (error) {
        console.error('[TimerService] startItemTimer error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Stops timer for a specific checklist item and saves entry.
 * @param {Object} t - Trello client
 * @param {string} checkItemId - Checklist item ID
 * @param {string} [description=''] - Entry description
 * @returns {Promise<{success: boolean, data?: Object, entry?: Object, error?: string}>}
 */
export const stopItemTimer = async (t, checkItemId, description = '') => {
    try {
        const timerData = validateTimerData(await StorageService.getTimerData(t));
        const itemData = timerData.checklistItems[checkItemId];

        if (!itemData || itemData.state !== TIMER_STATE.RUNNING || !itemData.currentEntry) {
            return { success: false, error: 'No active timer for this item', data: timerData };
        }

        const now = Date.now();
        const { startTime, pausedDuration = 0 } = itemData.currentEntry;
        const newEntry = createEntry(startTime, now, description);
        newEntry.duration = now - startTime - pausedDuration;

        const updatedData = {
            ...timerData,
            checklistItems: {
                ...timerData.checklistItems,
                [checkItemId]: {
                    ...itemData,
                    entries: [...itemData.entries, newEntry],
                    state: TIMER_STATE.IDLE,
                    currentEntry: null,
                },
            },
        };

        const saved = await StorageService.setTimerData(t, updatedData);
        return saved ? { success: true, data: updatedData, entry: newEntry } : { success: false, error: 'Save failed' };
    } catch (error) {
        console.error('[TimerService] stopItemTimer error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Sets estimate for a specific checklist item.
 * @param {Object} t - Trello client
 * @param {string} checkItemId - Checklist item ID
 * @param {number|null} estimatedTimeMs - Estimate in ms, or null to clear
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const setItemEstimate = async (t, checkItemId, estimatedTimeMs) => {
    try {
        const timerData = validateTimerData(await StorageService.getTimerData(t));
        const itemData = getOrInitItemData(timerData.checklistItems, checkItemId);

        const updatedData = {
            ...timerData,
            checklistItems: {
                ...timerData.checklistItems,
                [checkItemId]: {
                    ...itemData,
                    estimatedTime: estimatedTimeMs,
                },
            },
        };

        const saved = await StorageService.setTimerData(t, updatedData);
        return saved ? { success: true, data: updatedData } : { success: false, error: 'Save failed' };
    } catch (error) {
        console.error('[TimerService] setItemEstimate error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Gets current elapsed time for a checklist item.
 * @param {Object} itemData - Checklist item data
 * @returns {number} Elapsed ms
 */
export const getItemCurrentElapsed = (itemData) => {
    if (!itemData?.currentEntry) return 0;
    const { startTime, pausedDuration = 0 } = itemData.currentEntry;
    if (itemData.state === TIMER_STATE.RUNNING) return getElapsedTime(startTime) - pausedDuration;
    return 0;
};

const TimerService = {
    startTimer,
    stopTimer,
    getCurrentElapsed,
    setEstimate,
    deleteEntry,
    // Checklist item operations
    startItemTimer,
    stopItemTimer,
    setItemEstimate,
    getItemCurrentElapsed,
};
export default TimerService;
