/**
 * TimeUp - Report Service
 * Aggregates and exports time data across all cards
 */

import { formatDuration } from '../utils/formatTime.js';
import { STORAGE_KEYS, STORAGE_SCOPES } from '../utils/constants.js';

/**
 * Fetches timer data from all cards on the board.
 * @param {Object} t - Trello Power-Up client
 * @returns {Promise<Array>} Array of {cardId, cardName, entries}
 */
export const fetchAllCardTimers = async (t) => {
    try {
        // Get all cards on the board
        const cards = await t.cards('id', 'name');
        const results = [];

        for (const card of cards) {
            try {
                const timerData = await t.get(card.id, STORAGE_SCOPES.CARD_SHARED, STORAGE_KEYS.TIMER_DATA);
                if (timerData?.entries?.length > 0) {
                    results.push({
                        cardId: card.id,
                        cardName: card.name,
                        entries: timerData.entries.map(entry => ({
                            ...entry,
                            cardId: card.id,
                            cardName: card.name,
                        })),
                    });
                }
            } catch (err) {
                console.warn(`[ReportService] Failed to get data for card ${card.id}:`, err);
            }
        }

        return results;
    } catch (error) {
        console.error('[ReportService] fetchAllCardTimers error:', error);
        return [];
    }
};

/**
 * Flattens card data into a single array of entries.
 * @param {Array} cardData - Array from fetchAllCardTimers
 * @returns {Array} Flat array of entries with card metadata
 */
export const flattenEntries = (cardData) => {
    return cardData.flatMap(card => card.entries);
};

/**
 * Filters entries by date range.
 * @param {Array} entries - Array of entries
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 * @returns {Array} Filtered entries
 */
export const filterByDateRange = (entries, startDate, endDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return entries.filter(entry => {
        const entryDate = new Date(entry.startTime);
        return entryDate >= start && entryDate <= end;
    });
};

/**
 * Groups entries by date (YYYY-MM-DD).
 * @param {Array} entries - Array of entries
 * @returns {Object} Map of date string to entries
 */
export const groupByDate = (entries) => {
    const grouped = {};

    entries.forEach(entry => {
        const date = new Date(entry.startTime).toISOString().split('T')[0];
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(entry);
    });

    // Sort by date descending
    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const result = {};
    sortedKeys.forEach(key => {
        result[key] = grouped[key];
    });

    return result;
};

/**
 * Groups entries by card.
 * @param {Array} entries - Array of entries
 * @returns {Object} Map of cardId to {cardName, entries, totalDuration}
 */
export const groupByCard = (entries) => {
    const grouped = {};

    entries.forEach(entry => {
        if (!grouped[entry.cardId]) {
            grouped[entry.cardId] = {
                cardName: entry.cardName,
                entries: [],
                totalDuration: 0,
            };
        }
        grouped[entry.cardId].entries.push(entry);
        grouped[entry.cardId].totalDuration += entry.duration || 0;
    });

    return grouped;
};

/**
 * Calculates total duration from entries.
 * @param {Array} entries - Array of entries
 * @returns {number} Total duration in milliseconds
 */
export const calculateTotal = (entries) => {
    return entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
};

/**
 * Generates a CSV string from report data.
 * @param {Array} entries - Flat array of entries with card metadata
 * @returns {string} CSV content
 */
export const generateCSV = (entries) => {
    const headers = ['Date', 'Time', 'Card Name', 'Duration', 'Minutes'];

    const rows = entries.map(entry => {
        const date = new Date(entry.startTime);
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const durationStr = formatDuration(entry.duration, { compact: true });
        const minutes = Math.round(entry.duration / 60000);

        return [dateStr, timeStr, `"${entry.cardName.replace(/"/g, '""')}"`, durationStr, minutes].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
};

/**
 * Triggers a CSV file download.
 * @param {string} csvContent - CSV string
 * @param {string} filename - Filename for the download
 */
export const downloadCSV = (csvContent, filename = 'timeup-report.csv') => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const ReportService = {
    fetchAllCardTimers,
    flattenEntries,
    filterByDateRange,
    groupByDate,
    groupByCard,
    calculateTotal,
    generateCSV,
    downloadCSV,
};

export default ReportService;
