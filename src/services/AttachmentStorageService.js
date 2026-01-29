import StorageService from "./StorageService.js";

/**
 * AttachmentStorageService - Stores unlimited entries as card attachments
 * 
 * Strategy:
 * 1. Keep last 10 entries in card pluginData for quick access
 * 2. Store ALL entries in a JSON file attachment (no size limit)
 * 3. Update attachment whenever entries change
 * 4. Load from attachment when needed (lazy loading)
 * 
 * This bypasses Trello's 4KB/8KB pluginData limits entirely.
 */

const RECENT_ENTRIES_COUNT = 10; // Keep in pluginData for instant display
const ATTACHMENT_NAME = "timeup_entries.json"; // Attachment filename

/**
 * Gets all entries from both card storage and attachment.
 * @param {Object} t - Trello client
 * @returns {Promise<Array>} All entries sorted by createdAt (newest first)
 */
export const getAllEntries = async (t) => {
  try {
    const card = await t.card('id', 'attachments');
    
    // Find our JSON attachment
    const attachment = card.attachments?.find(att => att.name === ATTACHMENT_NAME);
    
    if (!attachment) {
      // No attachment yet - try legacy storage
      return await loadFromLegacyStorage(t);
    }
    
    // Download and parse attachment
    const response = await fetch(attachment.url);
    if (!response.ok) {
      console.error('[AttachmentStorage] Failed to fetch attachment:', response.status);
      return await loadFromLegacyStorage(t);
    }
    
    const data = await response.json();
    return Array.isArray(data.entries) ? data.entries : [];
    
  } catch (error) {
    console.error('[AttachmentStorage] Error loading entries:', error);
    // Fallback to legacy storage
    return await loadFromLegacyStorage(t);
  }
};

/**
 * Saves entries by creating/updating card attachment.
 * Also keeps recent entries in card storage for quick display.
 * @param {Object} t - Trello client
 * @param {Array} entries - All entries to save
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveEntries = async (t, entries) => {
  try {
    // Sort newest first
    const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
    
    // Save recent entries to card storage for instant display
    const recent = sorted.slice(0, RECENT_ENTRIES_COUNT);
    await StorageService.setData(t, 'card', 'shared', 'timerEntries_recent', recent);
    
    // Create JSON blob for attachment
    const jsonData = JSON.stringify({
      version: 2,
      lastUpdate: Date.now(),
      entries: sorted,
      count: sorted.length
    }, null, 2);
    
    // Create a data URL from the JSON
    const blob = new Blob([jsonData], { type: 'application/json' });
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    
    // Remove old attachment if exists
    const card = await t.card('attachments');
    const oldAttachment = card.attachments?.find(att => att.name === ATTACHMENT_NAME);
    if (oldAttachment) {
      await t.remove('card', 'attachment', oldAttachment.id);
    }
    
    // Attach new file using data URL
    await t.attach({
      name: ATTACHMENT_NAME,
      url: dataUrl
    });
    
    console.log(`[AttachmentStorage] Saved ${sorted.length} entries to attachment`);
    
    return { success: true, count: sorted.length };
    
  } catch (error) {
    console.error('[AttachmentStorage] Error saving entries:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Loads entries from legacy storage (board/card paginated storage).
 * Used as fallback or for migration.
 * @param {Object} t - Trello client
 * @returns {Promise<Array>} Entries from legacy storage
 */
const loadFromLegacyStorage = async (t) => {
  try {
    // Try to load from old EntryStorageService format
    const { getAllEntries } = await import('./EntryStorageService.js');
    const entries = await getAllEntries(t);
    
    // If we got entries, migrate them to attachment format
    if (entries.length > 0) {
      console.log(`[AttachmentStorage] Migrating ${entries.length} entries from legacy storage...`);
      await saveEntries(t, entries);
    }
    
    return entries;
    
  } catch (error) {
    console.warn('[AttachmentStorage] Legacy storage not available:', error);
    return [];
  }
};

/**
 * Deletes an entry by ID.
 * @param {Object} t - Trello client
 * @param {string} entryId - ID of entry to delete
 * @returns {Promise<{success: boolean}>}
 */
export const deleteEntry = async (t, entryId) => {
  const entries = await getAllEntries(t);
  const filtered = entries.filter(e => e.id !== entryId);
  
  if (filtered.length === entries.length) {
    return { success: false, error: 'Entry not found' };
  }
  
  return await saveEntries(t, filtered);
};

/**
 * Updates an entry by ID.
 * @param {Object} t - Trello client
 * @param {string} entryId - ID of entry to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean}>}
 */
export const updateEntry = async (t, entryId, updates) => {
  const entries = await getAllEntries(t);
  const entry = entries.find(e => e.id === entryId);
  
  if (!entry) {
    return { success: false, error: 'Entry not found' };
  }
  
  Object.assign(entry, updates);
  return await saveEntries(t, entries);
};

export default {
  getAllEntries,
  saveEntries,
  deleteEntry,
  updateEntry
};
