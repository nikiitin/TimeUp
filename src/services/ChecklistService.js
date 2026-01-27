/**
 * TimeUp - Checklist Service
 * Handles fetching checklists and calculating estimates from checklist items
 */

import { DEFAULTS, TIMER_STATE } from '../utils/constants.js';
import { sumDurations } from '../utils/formatTime.js';

/**
 * Fetches all checklists for the current card.
 * @param {Object} t - Trello Power-Up client
 * @returns {Promise<Array>} Array of checklists with checkItems
 */
export const getChecklists = async (t) => {
    try {
        const card = await t.card('checklists');
        return card.checklists || [];
    } catch (error) {
        console.error('[ChecklistService] getChecklists error:', error);
        return [];
    }
};

/**
 * Flattens all check items from all checklists.
 * @param {Array} checklists - Array of checklists
 * @returns {Array} Array of {id, name, state, checklistId, checklistName}
 */
export const getAllCheckItems = (checklists) => {
    if (!Array.isArray(checklists)) return [];
    
    const items = [];
    for (const checklist of checklists) {
        if (!checklist.checkItems) continue;
        for (const item of checklist.checkItems) {
            items.push({
                id: item.id,
                name: item.name,
                state: item.state, // 'complete' or 'incomplete'
                checklistId: checklist.id,
                checklistName: checklist.name,
            });
        }
    }
    return items;
};

/**
 * Calculates total estimate from all checklist items.
 * @param {Object} timerData - Timer data with checklistItems
 * @param {Array} checklists - Checklists from Trello
 * @returns {number} Total estimate in milliseconds
 */
export const calculateChecklistEstimate = (timerData, checklists) => {
    const allItems = getAllCheckItems(checklists);
    const checklistItems = timerData?.checklistItems || {};
    
    let total = 0;
    for (const item of allItems) {
        const itemData = checklistItems[item.id];
        if (itemData?.estimatedTime && itemData.estimatedTime > 0) {
            total += itemData.estimatedTime;
        }
    }
    return total;
};

/**
 * Gets the effective estimate (manual override or calculated from checklists).
 * @param {Object} timerData - Timer data
 * @param {Array} checklists - Checklists from Trello
 * @returns {number|null} Effective estimate in milliseconds
 */
export const getEffectiveEstimate = (timerData, checklists) => {
    // Manual override takes precedence
    if (timerData?.manualEstimateSet && timerData.estimatedTime > 0) {
        return timerData.estimatedTime;
    }
    
    // Otherwise calculate from checklists
    const checklistEstimate = calculateChecklistEstimate(timerData, checklists);
    return checklistEstimate > 0 ? checklistEstimate : null;
};

/**
 * Gets or initializes data for a specific checklist item.
 * @param {Object} timerData - Timer data
 * @param {string} checkItemId - Checklist item ID
 * @returns {Object} Checklist item data
 */
export const getCheckItemData = (timerData, checkItemId) => {
    const checklistItems = timerData?.checklistItems || {};
    return checklistItems[checkItemId] || { ...DEFAULTS.CHECKLIST_ITEM_DATA };
};

/**
 * Calculates total time spent on a checklist item.
 * @param {Object} itemData - Checklist item data
 * @returns {number} Total time in milliseconds
 */
export const getCheckItemTotalTime = (itemData) => {
    return sumDurations(itemData?.entries || []);
};

/**
 * Checks if any checklist item has a running timer.
 * @param {Object} timerData - Timer data
 * @returns {{isRunning: boolean, itemId: string|null}}
 */
export const getRunningCheckItem = (timerData) => {
    const checklistItems = timerData?.checklistItems || {};
    
    for (const [itemId, itemData] of Object.entries(checklistItems)) {
        if (itemData.state === TIMER_STATE.RUNNING) {
            return { isRunning: true, itemId };
        }
    }
    return { isRunning: false, itemId: null };
};

const ChecklistService = {
    getChecklists,
    getAllCheckItems,
    calculateChecklistEstimate,
    getEffectiveEstimate,
    getCheckItemData,
    getCheckItemTotalTime,
    getRunningCheckItem,
};

export default ChecklistService;
