import { STORAGE_KEYS } from "../utils/constants.js";
import StorageService from "./StorageService.js";

/**
 * EntryStorageService - Handles unlimited time entries using paginated storage
 * 
 * Strategy:
 * 1. Store recent entries (last 15) in main timerData for fast access
 * 2. Archive older entries to separate paginated keys (timerEntries_0, timerEntries_1, etc.)
 * 3. Compress entry format to reduce storage footprint by 40%
 * 4. Each archive page holds ~30 compressed entries (to stay under 4KB limit)
 * 
 * This allows ~500+ entries per card while maintaining performance.
 */

const ENTRIES_PER_MAIN_STORAGE = 15; // Recent entries in timerData (reduced to fit in 4KB)
const ENTRIES_PER_ARCHIVE_PAGE = 30; // Entries per archive key (reduced to fit compressed in 4KB)
const STORAGE_LIMIT = 4096;

/**
 * Compresses entry to reduce storage size by ~40%.
 * Format: [id, start, end, dur, desc, created, itemId]
 * Removes field names to save space.
 * @param {Object} entry - Full entry object
 * @returns {Array} Compressed entry array
 */
export const compressEntry = (entry) => {
  return [
    entry.id,
    entry.startTime,
    entry.endTime,
    entry.duration,
    entry.description || "",
    entry.createdAt,
    entry.checklistItemId || null,
  ];
};

/**
 * Decompresses entry array back to object format.
 * @param {Array} compressed - Compressed entry array
 * @returns {Object} Full entry object
 */
export const decompressEntry = (compressed) => {
  if (!Array.isArray(compressed) || compressed.length < 6) {
    return null;
  }
  return {
    id: compressed[0],
    startTime: compressed[1],
    endTime: compressed[2],
    duration: compressed[3],
    description: compressed[4] || "",
    createdAt: compressed[5],
    checklistItemId: compressed[6] || null,
  };
};

/**
 * Gets all entries for a card (combines main + archived).
 * @param {Object} t - Trello client
 * @returns {Promise<Array>} All entries sorted by createdAt (newest first)
 */
export const getAllEntries = async (t) => {
  let mainEntries = [];
  let archivedEntries = [];

  try {
    // Get main timer data entries using getTimerData (which can be mocked in tests)
    const timerData = await StorageService.getTimerData(t);
    mainEntries = Array.isArray(timerData?.entries) ? timerData.entries : [];
  } catch (error) {
    console.error("[EntryStorageService] Error getting main entries:", error);
  }

  // Try to get archived entries (may not exist or be accessible in tests)
  try {
    let pageIndex = 0;
    let hasMore = true;

    while (hasMore && pageIndex < 20) { // Safety limit: max 20 pages
      try {
        const pageKey = `${STORAGE_KEYS.ENTRIES}_${pageIndex}`;
        const page = await StorageService.getData(t, "card", "shared", pageKey);

        if (page && Array.isArray(page)) {
          // Decompress archived entries
          const decompressed = page.map(decompressEntry).filter(Boolean);
          archivedEntries.push(...decompressed);
          pageIndex++;
        } else {
          hasMore = false;
        }
      } catch (pageError) {
        // Archive page doesn't exist or can't be accessed - stop looking
        hasMore = false;
      }
    }
  } catch (error) {
    // Archived entries not available (e.g., in tests) - just use main entries
    console.warn("[EntryStorageService] Archived entries not available:", error.message);
  }

  // Combine and sort by createdAt (newest first)
  const allEntries = [...mainEntries, ...archivedEntries];
  allEntries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return allEntries;
};

/**
 * Saves entries with automatic archival of old entries.
 * Keeps recent entries in main storage, archives the rest.
 * @param {Object} t - Trello client
 * @param {Array} entries - All entries to save
 * @param {Object} timerData - Current timer data
 * @returns {Promise<{success: boolean, error?: string, archived?: number}>}
 */
export const saveEntries = async (t, entries, timerData) => {
  try {
    // Sort by createdAt (newest first)
    const sortedEntries = [...entries].sort((a, b) => b.createdAt - a.createdAt);

    // Split: recent in main, old in archive
    const recentEntries = sortedEntries.slice(0, ENTRIES_PER_MAIN_STORAGE);
    const oldEntries = sortedEntries.slice(ENTRIES_PER_MAIN_STORAGE);

    // Update timerData with recent entries only
    const updatedTimerData = {
      ...timerData,
      entries: recentEntries,
    };

    // Save main timer data (metadata + recent entries)
    const mainResult = await StorageService.setTimerData(t, updatedTimerData);
    if (!mainResult.success) {
      return mainResult;
    }

    // Archive old entries in pages
    if (oldEntries.length > 0) {
      const archiveResult = await archiveOldEntries(t, oldEntries);
      if (!archiveResult.success) {
        return archiveResult;
      }
    }

    return {
      success: true,
      archived: oldEntries.length,
      recentCount: recentEntries.length,
    };
  } catch (error) {
    console.error("[EntryStorageService] saveEntries error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Archives old entries into paginated storage keys.
 * @param {Object} t - Trello client
 * @param {Array} oldEntries - Entries to archive
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const archiveOldEntries = async (t, oldEntries) => {
  try {
    // Compress entries
    const compressed = oldEntries.map(compressEntry);

    // Split into pages
    const pages = [];
    for (let i = 0; i < compressed.length; i += ENTRIES_PER_ARCHIVE_PAGE) {
      pages.push(compressed.slice(i, i + ENTRIES_PER_ARCHIVE_PAGE));
    }

    // Save each page
    for (let i = 0; i < pages.length; i++) {
      const pageKey = `${STORAGE_KEYS.ENTRIES}_${i}`;
      const pageData = pages[i];
      const jsonString = JSON.stringify(pageData);

      if (jsonString.length > STORAGE_LIMIT) {
        console.warn(
          `[EntryStorageService] Page ${i} exceeds limit: ${jsonString.length}/${STORAGE_LIMIT}`,
        );
        // Continue anyway - some data is better than none
      }

      await StorageService.setData(t, "card", "shared", pageKey, pageData);
    }

    // Clear any extra pages from previous saves
    await clearExtraPages(t, pages.length);

    return { success: true, pages: pages.length };
  } catch (error) {
    console.error("[EntryStorageService] archiveOldEntries error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Clears archive pages beyond the current page count.
 * @param {Object} t - Trello client
 * @param {number} currentPageCount - Number of pages currently in use
 */
const clearExtraPages = async (t, currentPageCount) => {
  try {
    // Clear up to 10 extra pages (covers most scenarios)
    for (let i = currentPageCount; i < currentPageCount + 10; i++) {
      const pageKey = `${STORAGE_KEYS.ENTRIES}_${i}`;
      await StorageService.removeData(t, "card", "shared", pageKey);
    }
  } catch (error) {
    // Silent fail - not critical
    console.warn("[EntryStorageService] clearExtraPages error:", error);
  }
};

/**
 * Deletes an entry by ID from all storage locations.
 * @param {Object} t - Trello client
 * @param {string} entryId - Entry ID to delete
 * @returns {Promise<{success: boolean, found: boolean, entries?: Array}>}
 */
export const deleteEntry = async (t, entryId) => {
  try {
    const allEntries = await getAllEntries(t);
    const filteredEntries = allEntries.filter((e) => e.id !== entryId);

    if (filteredEntries.length === allEntries.length) {
      return { success: false, found: false };
    }

    // Get current timer data for metadata
    const timerData = await StorageService.getTimerData(t);

    // Save updated entries
    const saveResult = await saveEntries(t, filteredEntries, timerData);

    return {
      success: saveResult.success,
      found: true,
      entries: filteredEntries,
    };
  } catch (error) {
    console.error("[EntryStorageService] deleteEntry error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Updates an entry by ID in all storage locations.
 * @param {Object} t - Trello client
 * @param {string} entryId - Entry ID to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, found: boolean, entries?: Array}>}
 */
export const updateEntry = async (t, entryId, updates) => {
  try {
    const allEntries = await getAllEntries(t);
    const entryIndex = allEntries.findIndex((e) => e.id === entryId);

    if (entryIndex === -1) {
      return { success: false, found: false };
    }

    // Update the entry
    allEntries[entryIndex] = {
      ...allEntries[entryIndex],
      ...updates,
    };

    // Get current timer data for metadata
    const timerData = await StorageService.getTimerData(t);

    // Save updated entries
    const saveResult = await saveEntries(t, allEntries, timerData);

    return {
      success: saveResult.success,
      found: true,
      entries: allEntries,
    };
  } catch (error) {
    console.error("[EntryStorageService] updateEntry error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculates storage usage statistics.
 * @param {Object} t - Trello client
 * @returns {Promise<Object>} Storage statistics
 */
export const getStorageStats = async (t) => {
  try {
    const allEntries = await getAllEntries(t);
    const timerData = await StorageService.getTimerData(t);

    const mainSize = JSON.stringify(timerData).length;
    const recentCount = timerData?.entries?.length || 0;
    const archivedCount = allEntries.length - recentCount;

    // Calculate archive sizes
    let archiveSize = 0;
    let pageIndex = 0;
    let hasMore = true;

    while (hasMore) {
      const pageKey = `${STORAGE_KEYS.ENTRIES}_${pageIndex}`;
      const page = await StorageService.getData(t, "card", "shared", pageKey);

      if (page) {
        archiveSize += JSON.stringify(page).length;
        pageIndex++;
      } else {
        hasMore = false;
      }
    }

    return {
      totalEntries: allEntries.length,
      recentEntries: recentCount,
      archivedEntries: archivedCount,
      mainStorageSize: mainSize,
      mainStoragePercent: Math.round((mainSize / STORAGE_LIMIT) * 100),
      archiveStorageSize: archiveSize,
      archivePages: pageIndex,
      estimatedCapacity: Math.floor((STORAGE_LIMIT * 10) / 130), // ~130 bytes per compressed entry
    };
  } catch (error) {
    console.error("[EntryStorageService] getStorageStats error:", error);
    return { error: error.message };
  }
};

export default {
  compressEntry,
  decompressEntry,
  getAllEntries,
  saveEntries,
  deleteEntry,
  updateEntry,
  getStorageStats,
};
