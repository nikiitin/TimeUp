/**
 * TimeUp - Checklist Service
 * Handles fetching checklists and calculating estimates from checklist items
 */

import { DEFAULTS, TIMER_STATE } from '../utils/constants.js';
import { sumDurations } from '../utils/formatTime.js';
import { AppConfig } from '../config/AppConfig.js';

/**
 * Fetches all checklists for the current card.
 * @param {Object} t - Trello Power-Up client
 * @returns {Promise<Array|null>} Array of checklists if successful/empty, or null if not authorized
 */
export const getChecklists = async (t) => {
    try {
        const context = t.getContext();
        const cardId = context.card;

        const restApi = t.getRestApi();
        const isAuthorized = await restApi.isAuthorized();

        if (!isAuthorized) {
            console.log('[ChecklistService] Not authorized for REST API.');
            return null;
        }

        const token = await restApi.getToken();
        if (!token) {
            console.warn('[ChecklistService] Authorized but no token?');
            return [];
        }

        if (!cardId) {
             console.error('[ChecklistService] No card ID found in context.');
             return [];
        }

        // Fetch directly from Trello API
        const response = await fetch(`https://api.trello.com/1/cards/${cardId}/checklists?key=${AppConfig.APP_KEY}&token=${token}`);
        
        if (!response.ok) {
            throw new Error(`API Error ${response.status}: ${response.statusText}`);
        }

        return (await response.json()) || [];
    } catch (error) {
        console.error('[ChecklistService] REST API error:', error);
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
    
    return checklists.flatMap(checklist => 
        (checklist.checkItems || []).map(item => ({
            id: item.id,
            name: item.name,
            state: item.state,
            checklistId: checklist.id,
            checklistName: checklist.name,
        }))
    );
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
    
    return allItems.reduce((total, item) => {
        const estimate = checklistItems[item.id]?.estimatedTime;
        return total + (estimate > 0 ? estimate : 0);
    }, 0);
};

/**
 * Gets the effective estimate (manual override or calculated from checklists).
 * @param {Object} timerData - Timer data
 * @param {Array} checklists - Checklists from Trello
 * @returns {number|null} Effective estimate in milliseconds
 */
export const getEffectiveEstimate = (timerData, checklists) => {
    if (timerData?.manualEstimateSet && timerData.estimatedTime > 0) {
        return timerData.estimatedTime;
    }
    const derived = calculateChecklistEstimate(timerData, checklists);
    return derived > 0 ? derived : null;
};

/**
 * Gets or initializes data for a specific checklist item.
 * @param {Object} timerData - Timer data
 * @param {string} checkItemId - Checklist item ID
 * @returns {Object} Checklist item data
 */
export const getCheckItemData = (timerData, checkItemId) => {
    return (timerData?.checklistItems?.[checkItemId]) || { ...DEFAULTS.CHECKLIST_ITEM_DATA };
};

/**
 * Calculates total time spent on a checklist item.
 * @param {Object} timerData - Global timer data
 * @param {string} itemId - Checklist item ID
 * @returns {number} Total time in milliseconds
 */
export const getCheckItemTotalTime = (timerData, itemId) => {
    const entries = (timerData?.entries || []).filter(e => e.checklistItemId === itemId);
    return sumDurations(entries);
};

/**
 * Checks if any checklist item has a running timer.
 * @param {Object} timerData - Timer data
 * @returns {{isRunning: boolean, itemId: string|null}}
 */
export const getRunningCheckItem = (timerData) => {
    const checklistItems = timerData?.checklistItems || {};
    // Object.entries + find is cleaner
    const found = Object.entries(checklistItems).find(([_, data]) => data.state === TIMER_STATE.RUNNING);
    
    return found 
        ? { isRunning: true, itemId: found[0] } 
        : { isRunning: false, itemId: null };
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
