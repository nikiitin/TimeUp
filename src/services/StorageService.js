import { STORAGE_KEYS, STORAGE_SCOPES, DEFAULTS } from "../utils/constants.js";

const STORAGE_LIMIT = 4096; // Trello's per-key character limit

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
export const getData = async (
  t,
  scope,
  visibility,
  key,
  defaultValue = null,
) => {
  try {
    const data = await t.get(scope, visibility, key);
    return data ?? defaultValue;
  } catch (error) {
    console.error(
      `[StorageService] Failed to get "${key}" from ${scope}/${visibility}:`,
      error,
    );
    return defaultValue;
  }
};

export const setData = async (t, scope, visibility, key, value) => {
  try {
    const jsonString = JSON.stringify(value);
    if (jsonString.length > STORAGE_LIMIT) {
      console.error(
        `[StorageService] Size limit exceeded for "${key}": ${jsonString.length}/${STORAGE_LIMIT} characters.`,
      );
      return {
        success: false,
        error: "LIMIT_EXCEEDED",
        size: jsonString.length,
      };
    }

    await t.set(scope, visibility, key, value);
    return { success: true, size: jsonString.length };
  } catch (error) {
    console.error(
      `[StorageService] Failed to set "${key}" in ${scope}/${visibility}:`,
      error,
    );
    return { success: false, error: error.message };
  }
};

/**
 * Calculates current storage usage percentage for a key.
 * @param {*} value - The value being stored
 * @returns {Object} { size, limit, percent, isNearLimit }
 */
export const calculateUsage = (value) => {
  const size = JSON.stringify(value).length;
  return {
    size,
    limit: STORAGE_LIMIT,
    percent: Math.round((size / STORAGE_LIMIT) * 100),
    isNearLimit: size > STORAGE_LIMIT * 0.8, // 80% threshold
  };
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
    console.error(
      `[StorageService] Failed to remove "${key}" from ${scope}/${visibility}:`,
      error,
    );
    return false;
  }
};

// =============================================================================
// CARD-SPECIFIC OPERATIONS
// =============================================================================

/**
 * Gets all timer-related data, merging metadata and entries.
 */
export const getTimerData = async (t) => {
  const allData = await t.get("card", STORAGE_SCOPES.CARD_SHARED);
  let timerData = {
    ...(allData?.[STORAGE_KEYS.TIMER_DATA] || DEFAULTS.TIMER_DATA),
  };
  let entries = allData?.[STORAGE_KEYS.ENTRIES] || [];

  return { ...timerData, entries };
};

/**
 * Saves timer data by splitting it into metadata and entries keys.
 */
export const setTimerData = async (t, timerData) => {
  const { entries, ...metadata } = timerData;

  // Save metadata and entries in parallel
  const p1 = setData(
    t,
    "card",
    STORAGE_SCOPES.CARD_SHARED,
    STORAGE_KEYS.TIMER_DATA,
    metadata,
  );
  const p2 = setData(
    t,
    "card",
    STORAGE_SCOPES.CARD_SHARED,
    STORAGE_KEYS.ENTRIES,
    entries,
  );

  const [res1, res2] = await Promise.all([p1, p2]);

  if (!res1.success) return res1;
  if (!res2.success) return res2;

  return {
    success: true,
    size: res1.size + res2.size,
    metadataSize: res1.size,
    entriesSize: res2.size,
  };
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
    "board",
    STORAGE_SCOPES.CARD_SHARED,
    STORAGE_KEYS.BOARD_SETTINGS,
    { ...DEFAULTS.BOARD_SETTINGS },
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
    "board",
    STORAGE_SCOPES.CARD_SHARED,
    STORAGE_KEYS.BOARD_SETTINGS,
    settings,
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
    "member",
    STORAGE_SCOPES.CARD_PRIVATE,
    STORAGE_KEYS.USER_PREFERENCES,
    { ...DEFAULTS.USER_PREFERENCES },
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
    "member",
    STORAGE_SCOPES.CARD_PRIVATE,
    STORAGE_KEYS.USER_PREFERENCES,
    preferences,
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
  calculateUsage,
  getBoardSettings,
  setBoardSettings,
  getUserPreferences,
  setUserPreferences,
};

export default StorageService;
