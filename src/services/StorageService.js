/**
 * TimingUp - Storage Service
 * Abstraction layer over Trello's t.set() and t.get() API
 * Provides consistent error handling and data validation
 */

import { STORAGE_KEYS, STORAGE_SCOPES, DEFAULTS } from '../utils/constants.js';

/**
 * Gets data from Trello storage with error handling.
 * @param {Object} t - Trello Power-Up client instance
 * @param {string} scope - Storage scope ('card' | 'board' | 'member')
 * @param {string} visibility - Visibility ('shared' | 'private')
 * @param {string} key - Storage key
 * @param {*} [defaultValue=null] - Default value if key doesn't exist
 * @returns {Promise<*>} Retrieved data or default value
 * @example
 * const timerData = await getData(t, 'card', 'shared', STORAGE_KEYS.TIMER_DATA, DEFAULTS.TIMER_DATA);
 */
export const getData = async (t, scope, visibility, key, defaultValue = null) => {
    try {
        const data = await t.get(scope, visibility, key);
        return data ?? defaultValue;
    } catch (error) {
        console.error(`[StorageService] Failed to get "${key}" from ${scope}/${visibility}:`, error);
        return defaultValue;
    }
};

/**
 * Sets data in Trello storage with error handling.
 * @param {Object} t - Trello Power-Up client instance
 * @param {string} scope - Storage scope ('card' | 'board' | 'member')
 * @param {string} visibility - Visibility ('shared' | 'private')
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {Promise<boolean>} True if successful, false otherwise
 * @example
 * const success = await setData(t, 'card', 'shared', STORAGE_KEYS.TIMER_DATA, timerData);
 */
export const setData = async (t, scope, visibility, key, value) => {
    try {
        await t.set(scope, visibility, key, value);
        return true;
    } catch (error) {
        console.error(`[StorageService] Failed to set "${key}" in ${scope}/${visibility}:`, error);
        return false;
    }
};

/**
 * Removes data from Trello storage.
 * @param {Object} t - Trello Power-Up client instance
 * @param {string} scope - Storage scope ('card' | 'board' | 'member')
 * @param {string} visibility - Visibility ('shared' | 'private')
 * @param {string} key - Storage key to remove
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export const removeData = async (t, scope, visibility, key) => {
    try {
        await t.remove(scope, visibility, key);
        return true;
    } catch (error) {
        console.error(`[StorageService] Failed to remove "${key}" from ${scope}/${visibility}:`, error);
        return false;
    }
};

// =============================================================================
// CARD-SPECIFIC OPERATIONS
// =============================================================================

/**
 * Gets timer data for the current card.
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Object>} Timer data with entries, state, and currentEntry
 */
export const getTimerData = async (t) => {
    return getData(
        t,
        'card',
        STORAGE_SCOPES.CARD_SHARED,
        STORAGE_KEYS.TIMER_DATA,
        { ...DEFAULTS.TIMER_DATA }
    );
};

/**
 * Saves timer data for the current card.
 * @param {Object} t - Trello Power-Up client instance
 * @param {Object} timerData - Timer data to save
 * @returns {Promise<boolean>} True if successful
 */
export const setTimerData = async (t, timerData) => {
    return setData(
        t,
        'card',
        STORAGE_SCOPES.CARD_SHARED,
        STORAGE_KEYS.TIMER_DATA,
        timerData
    );
};

// =============================================================================
// BOARD-SPECIFIC OPERATIONS
// =============================================================================

/**
 * Gets board-wide settings.
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Object>} Board settings
 */
export const getBoardSettings = async (t) => {
    return getData(
        t,
        'board',
        STORAGE_SCOPES.CARD_SHARED,
        STORAGE_KEYS.BOARD_SETTINGS,
        { ...DEFAULTS.BOARD_SETTINGS }
    );
};

/**
 * Saves board-wide settings.
 * @param {Object} t - Trello Power-Up client instance
 * @param {Object} settings - Settings to save
 * @returns {Promise<boolean>} True if successful
 */
export const setBoardSettings = async (t, settings) => {
    return setData(
        t,
        'board',
        STORAGE_SCOPES.CARD_SHARED,
        STORAGE_KEYS.BOARD_SETTINGS,
        settings
    );
};

// =============================================================================
// USER-SPECIFIC OPERATIONS
// =============================================================================

/**
 * Gets user preferences.
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Object>} User preferences
 */
export const getUserPreferences = async (t) => {
    return getData(
        t,
        'member',
        STORAGE_SCOPES.CARD_PRIVATE,
        STORAGE_KEYS.USER_PREFERENCES,
        { ...DEFAULTS.USER_PREFERENCES }
    );
};

/**
 * Saves user preferences.
 * @param {Object} t - Trello Power-Up client instance
 * @param {Object} preferences - Preferences to save
 * @returns {Promise<boolean>} True if successful
 */
export const setUserPreferences = async (t, preferences) => {
    return setData(
        t,
        'member',
        STORAGE_SCOPES.CARD_PRIVATE,
        STORAGE_KEYS.USER_PREFERENCES,
        preferences
    );
};

/**
 * StorageService default export - provides all storage operations
 */
const StorageService = {
    getData,
    setData,
    removeData,
    getTimerData,
    setTimerData,
    getBoardSettings,
    setBoardSettings,
    getUserPreferences,
    setUserPreferences,
};

export default StorageService;
