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
    
    // Enhanced debug logging for timerData specifically
    if (key === STORAGE_KEYS.TIMER_DATA) {
      console.log("[setData] About to save timerData:");
      console.log("  - Size:", jsonString.length, "chars");
      console.log("  - Keys:", Object.keys(value));
      console.log("  - Full value:", jsonString);
    }
    
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
    
    if (key === STORAGE_KEYS.TIMER_DATA) {
      console.log("[setData] Successfully saved timerData");
    }
    
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
 * Gets timer data (metadata only - no entries, no checklistItems).
 * NOTE: This only loads metadata. Use EntryStorageService.getAllEntries() for entries
 * and getChecklistItems() for checklist data.
 */
export const getTimerData = async (t) => {
  const timerData = await getData(
    t,
    "card",
    STORAGE_SCOPES.CARD_SHARED,
    STORAGE_KEYS.TIMER_DATA,
    DEFAULTS.TIMER_DATA,
  );

  // Load checklist items from separate storage
  const checklistItems = await getData(
    t,
    "card",
    STORAGE_SCOPES.CARD_SHARED,
    STORAGE_KEYS.CHECKLIST_ITEMS,
    {},
  );
  
  timerData.checklistItems = checklistItems;
  timerData.entries = []; // Entries must be loaded via EntryStorageService.getAllEntries()

  return timerData;
};

/**
 * Saves ONLY timer metadata (state, estimates) WITHOUT entries or checklistItems.
 * Used by EntryStorageService to save metadata while entries and checklistItems are handled separately.
 * @param {Object} t - Trello client
 * @param {Object} metadata - Timer metadata (entries and checklistItems will be stored separately)
 * @returns {Promise<{success: boolean, size?: number, error?: string}>}
 */
export const setTimerMetadata = async (t, metadata) => {
  const { entries, checklistItems, ...metadataOnly } = metadata;
  
  // Debug logging to see what's being saved
  console.log("[setTimerMetadata] Metadata size:", JSON.stringify(metadataOnly).length, "chars");
  console.log("[setTimerMetadata] Metadata keys:", Object.keys(metadataOnly));
  console.log("[setTimerMetadata] ACTUAL METADATA:", JSON.stringify(metadataOnly));
  
  // Save checklist items to separate storage key to prevent metadata bloat
  if (checklistItems && Object.keys(checklistItems).length > 0) {
    console.log("[setTimerMetadata] Saving", Object.keys(checklistItems).length, "checklist items separately");
    await setData(
      t,
      "card",
      STORAGE_SCOPES.CARD_SHARED,
      STORAGE_KEYS.CHECKLIST_ITEMS,
      checklistItems,
    );
  }
  
  // Check what's currently in storage before overwriting
  try {
    const currentData = await t.get("card", "shared", STORAGE_KEYS.TIMER_DATA);
    if (currentData) {
      console.log("[setTimerMetadata] CURRENT timerData in storage:", JSON.stringify(currentData).length, "chars");
      console.log("[setTimerMetadata] CURRENT keys:", Object.keys(currentData));
    }
  } catch (e) {
    console.log("[setTimerMetadata] Could not read current storage:", e.message);
  }
  
  // Save minimal metadata (state, currentEntry, estimatedTime only)
  return await setData(
    t,
    "card",
    STORAGE_SCOPES.CARD_SHARED,
    STORAGE_KEYS.TIMER_DATA,
    metadataOnly,
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
  setTimerMetadata,
  calculateUsage,
  getBoardSettings,
  setBoardSettings,
  getUserPreferences,
  setUserPreferences,
};

export default StorageService;
