/**
 * TimeUp - Timer Service
 * Business logic for timer operations
 */

import { TIMER_STATE, DEFAULTS, VALIDATION } from "../utils/constants.js";
import { getElapsedTime } from "../utils/formatTime.js";
import StorageService from "./StorageService.js";
import AttachmentStorageService from "./AttachmentStorageService.js";

/**
 * Creates a new time entry.
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp
 * @param {string} [description=''] - Description
 * @returns {Object} Time entry
 */
const createEntry = (startTime, endTime, description = "") => {
  const truncatedDescription = (description || "").substring(
    0,
    VALIDATION.MAX_DESCRIPTION_LENGTH,
  );

  return {
    id: `e_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
    startTime,
    endTime,
    duration: endTime - startTime,
    description: truncatedDescription,
    createdAt: endTime, // Use endTime as creation timestamp
  };
};

/**
 * Common helper to handle AttachmentStorageService results.
 * Saves unlimited entries as card attachments.
 * @param {Object} t - Trello client
 * @param {Object} updatedData - The data to save
 * @param {Object} extra - Extra fields to include in success response
 * @returns {Promise<Object>} Timer response
 */
const handleSaveResult = async (t, updatedData, extra = {}) => {
  try {
    // Save entries to attachment storage
    const result = await AttachmentStorageService.saveEntries(
      t,
      updatedData.entries || [],
      updatedData
    );
    
    if (result.success) {
      return { success: true, data: updatedData, ...extra };
    }
    
    const errorMsg =
      result.error === "LIMIT_EXCEEDED"
        ? "Storage limit reached. Try shortening descriptions."
        : "Save failed";
    return { success: false, error: errorMsg };
  } catch (error) {
    console.error("[TimerService] handleSaveResult error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Stops a checklist item timer and creates linked entries.
 * Helper to reduce duplication in timer switching logic.
 * @param {Object} timerData - Current timer data
 * @param {string} itemId - Checklist item ID to stop
 * @param {Object} itemData - Current item data
 * @param {string} [description=''] - Entry description
 * @returns {{timerData: Object, entry: Object}} Updated timer data and created entry
 */
const stopItemAndCreateEntry = (
  timerData,
  itemId,
  itemData,
  description = "",
) => {
  const now = Date.now();
  const { startTime, pausedDuration = 0 } = itemData.currentEntry;
  const newEntry = createEntry(startTime, now, description);
  newEntry.duration = now - startTime - pausedDuration;
  newEntry.checklistItemId = itemId;

  return {
    entry: newEntry,
    timerData: {
      ...timerData,
      entries: [...timerData.entries, newEntry],
      checklistItems: {
        ...timerData.checklistItems,
        [itemId]: {
          ...itemData,
          state: TIMER_STATE.IDLE,
          currentEntry: null,
        },
      },
    },
  };
};

/**
 * Validates timer data structure.
 * @param {Object} data - Timer data
 * @returns {Object} Validated timer data
 */
const validateTimerData = (data) => ({
  entries: Array.isArray(data?.entries) ? data.entries : [],
  state: Object.values(TIMER_STATE).includes(data?.state)
    ? data.state
    : TIMER_STATE.IDLE,
  currentEntry: data?.currentEntry ?? null,
  estimatedTime:
    typeof data?.estimatedTime === "number" ? data.estimatedTime : null,
  manualEstimateSet: data?.manualEstimateSet ?? false,
  checklistItems: data?.checklistItems ?? {},
});

/**
 * Starts the global timer. If a checklist item timer is running, stops it first (switch behavior).
 * @param {Object} t - Trello client
 * @returns {Promise<{success: boolean, data?: Object, stoppedItemId?: string, error?: string}>}
 */
export const startTimer = async (t) => {
  try {
    // Load all entries (main + archived)
    const allEntries = await AttachmentStorageService.getAllEntries(t);
    let timerData = validateTimerData(await StorageService.getTimerData(t));
    timerData.entries = allEntries; // Merge all entries
    let stoppedItemId = null;

    if (timerData.state === TIMER_STATE.RUNNING) {
      return {
        success: false,
        error: "Timer already running",
        data: timerData,
      };
    }

    // Switch behavior: stop any running checklist timer first
    for (const [id, item] of Object.entries(timerData.checklistItems)) {
      if (item.state === TIMER_STATE.RUNNING && item.currentEntry) {
        stoppedItemId = id;
        const result = stopItemAndCreateEntry(timerData, id, item, "");
        timerData = result.timerData;
        break;
      }
    }

    const updatedData = {
      ...timerData,
      state: TIMER_STATE.RUNNING,
      currentEntry: { startTime: Date.now(), pausedDuration: 0 },
    };
    return await handleSaveResult(t, updatedData, { stoppedItemId });
  } catch (error) {
    console.error("[TimerService] startTimer error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Stops the timer and saves entry.
 * @param {Object} t - Trello client
 * @param {string} [description=''] - Entry description
 * @returns {Promise<{success: boolean, data?: Object, entry?: Object, error?: string}>}
 */
export const stopTimer = async (t, description = "") => {
  try {
    // Load all entries (main + archived)
    const allEntries = await AttachmentStorageService.getAllEntries(t);
    const timerData = validateTimerData(await StorageService.getTimerData(t));
    timerData.entries = allEntries; // Merge all entries
    
    if (timerData.state === TIMER_STATE.IDLE || !timerData.currentEntry) {
      console.warn("[TimerService] Cannot stop: No active timer");
      return { success: false, error: "No active timer", data: timerData };
    }
    const now = Date.now();
    const { startTime, pausedDuration = 0 } = timerData.currentEntry;
    const newEntry = createEntry(startTime, now, description);
    newEntry.duration = now - startTime - pausedDuration;
    const updatedData = {
      ...timerData,
      entries: [...timerData.entries, newEntry],
      state: TIMER_STATE.IDLE,
      currentEntry: null,
    };
    return await handleSaveResult(t, updatedData, { entry: newEntry });
  } catch (error) {
    console.error("[TimerService] stopTimer error:", error);
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
  if (timerData.state === TIMER_STATE.RUNNING)
    return getElapsedTime(startTime) - pausedDuration;
  return timerData.currentEntry.elapsedBeforePause ?? 0;
};

/**
 * Sets the time estimate for a card (manual override).
 * When set, this value overrides the calculated checklist estimate.
 * When cleared (null), the estimate falls back to the sum of checklist item estimates if any exist.
 * @param {Object} t - Trello client
 * @param {number|null} estimatedTimeMs - Estimated time in milliseconds, or null to clear and use checklist-based estimate
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
    return await handleSaveResult(t, updatedData);
  } catch (error) {
    console.error("[TimerService] setEstimate error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Deletes a time entry by ID.
 * Uses EntryStorageService to handle entries across all storage locations.
 * @param {Object} t - Trello client
 * @param {string} entryId - ID of the entry to delete
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const deleteEntry = async (t, entryId) => {
  try {
    const result = await AttachmentStorageService.deleteEntry(t, entryId);
    
    if (!result.found) {
      const timerData = validateTimerData(await StorageService.getTimerData(t));
      return { success: false, error: "Entry not found", data: timerData };
    }
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Return updated timerData with all entries
    const timerData = validateTimerData(await StorageService.getTimerData(t));
    timerData.entries = result.entries;
    return { success: true, data: timerData };
  } catch (error) {
    console.error("[TimerService] deleteEntry error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Updates an existing time entry.
 * Uses EntryStorageService to handle entries across all storage locations.
 * @param {Object} t - Trello client
 * @param {string} entryId - Entry ID to update
 * @param {Object} updates - Fields to update: { duration?, checklistItemId?, description? }
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const updateEntry = async (t, entryId, updates) => {
  try {
    // Prepare updates with validation
    const sanitizedUpdates = {};
    
    if (updates.duration !== undefined) {
      sanitizedUpdates.duration = updates.duration;
    }
    
    if (updates.checklistItemId !== undefined) {
      sanitizedUpdates.checklistItemId = updates.checklistItemId || null;
    }
    
    if (updates.description !== undefined) {
      sanitizedUpdates.description = (updates.description || "").substring(
        0,
        VALIDATION.MAX_DESCRIPTION_LENGTH,
      );
    }
    
    const result = await AttachmentStorageService.updateEntry(t, entryId, sanitizedUpdates);
    
    if (!result.found) {
      const timerData = validateTimerData(await StorageService.getTimerData(t));
      return { success: false, error: "Entry not found", data: timerData };
    }
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Return updated timerData with all entries
    const timerData = validateTimerData(await StorageService.getTimerData(t));
    timerData.entries = result.entries;
    const updatedEntry = result.entries.find(e => e.id === entryId);
    return { success: true, data: timerData, entry: updatedEntry };
  } catch (error) {
    console.error("[TimerService] updateEntry error:", error);
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
  return checklistItems[itemId] || { ...DEFAULTS.CHECKLIST_ITEM_DATA };
};

/**
 * Starts timer for a specific checklist item.
 * Switch behavior: stops global timer or other checklist timer first.
 * @param {Object} t - Trello client
 * @param {string} checkItemId - Checklist item ID
 * @returns {Promise<{success: boolean, data?: Object, stoppedItemId?: string, stoppedGlobal?: boolean, error?: string}>}
 */
export const startItemTimer = async (t, checkItemId) => {
  try {
    // Load all entries (main + archived)
    const allEntries = await AttachmentStorageService.getAllEntries(t);
    let timerData = validateTimerData(await StorageService.getTimerData(t));
    timerData.entries = allEntries; // Merge all entries
    let stoppedItemId = null;
    let stoppedGlobal = false;

    // Switch behavior: stop any other running checklist timer first
    for (const [id, item] of Object.entries(timerData.checklistItems)) {
      if (
        item.state === TIMER_STATE.RUNNING &&
        item.currentEntry &&
        id !== checkItemId
      ) {
        stoppedItemId = id;
        const result = stopItemAndCreateEntry(timerData, id, item, "");
        timerData = result.timerData;
        break;
      }
    }

    // Switch behavior: stop global timer if running
    if (timerData.state === TIMER_STATE.RUNNING && timerData.currentEntry) {
      stoppedGlobal = true;
      const now = Date.now();
      const { startTime, pausedDuration = 0 } = timerData.currentEntry;
      const newEntry = createEntry(startTime, now, "");
      newEntry.duration = now - startTime - pausedDuration;

      timerData = {
        ...timerData,
        entries: [...timerData.entries, newEntry],
        state: TIMER_STATE.IDLE,
        currentEntry: null,
      };
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

    return await handleSaveResult(t, updatedData, {
      stoppedItemId,
      stoppedGlobal,
    });
  } catch (error) {
    console.error("[TimerService] startItemTimer error:", error);
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
export const stopItemTimer = async (t, checkItemId, description = "") => {
  try {
    // Load all entries (main + archived)
    const allEntries = await AttachmentStorageService.getAllEntries(t);
    const timerData = validateTimerData(await StorageService.getTimerData(t));
    timerData.entries = allEntries; // Merge all entries
    const itemData = timerData.checklistItems[checkItemId];

    if (
      !itemData ||
      itemData.state !== TIMER_STATE.RUNNING ||
      !itemData.currentEntry
    ) {
      return {
        success: false,
        error: "No active timer for this item",
        data: timerData,
      };
    }

    const now = Date.now();
    const { startTime, pausedDuration = 0 } = itemData.currentEntry;
    const newEntry = createEntry(startTime, now, description);
    newEntry.duration = now - startTime - pausedDuration;
    newEntry.checklistItemId = checkItemId; // Link to checklist item

    const updatedData = {
      ...timerData,
      // Also add to global entries (linked entry)
      entries: [...timerData.entries, newEntry],
      checklistItems: {
        ...timerData.checklistItems,
        [checkItemId]: {
          ...itemData,
          state: TIMER_STATE.IDLE,
          currentEntry: null,
        },
      },
    };

    return await handleSaveResult(t, updatedData, { entry: newEntry });
  } catch (error) {
    console.error("[TimerService] stopItemTimer error:", error);
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

    return await handleSaveResult(t, updatedData);
  } catch (error) {
    console.error("[TimerService] setItemEstimate error:", error);
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
  if (itemData.state === TIMER_STATE.RUNNING)
    return getElapsedTime(startTime) - pausedDuration;
  return 0;
};
/**
 * Gets storage usage stats for timer data.
 * Considers both metadata and entries keys separately.
 * @param {Object} timerData - Current timer data
 * @returns {Object} Usage stats for the most full key
 */
export const getStorageUsage = (timerData) => {
  const { entries, ...metadata } = timerData;
  const metadataUsage = StorageService.calculateUsage(metadata);
  const entriesUsage = StorageService.calculateUsage(entries);

  // Return the one that is more full
  return metadataUsage.percent > entriesUsage.percent
    ? metadataUsage
    : entriesUsage;
};

const TimerService = {
  startTimer,
  stopTimer,
  getCurrentElapsed,
  setEstimate,
  deleteEntry,
  updateEntry,
  // Checklist item operations
  startItemTimer,
  stopItemTimer,
  setItemEstimate,
  getItemCurrentElapsed,
  getStorageUsage,
};
export default TimerService;
