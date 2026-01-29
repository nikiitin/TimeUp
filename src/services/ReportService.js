/**
 * TimeUp - Report Service
 * Aggregates and exports time data across all cards
 */

import { formatDuration } from '../utils/formatTime.js';

/**
 * Fetches timer data from all cards on the board.
 * @param {Object} t - Trello Power-Up client
 * @returns {Promise<Array>} Array of {cardId, cardName, totalTime, recentEntries}
 */
export const fetchAllCardTimers = async (t) => {
    try {
        // Get all cards on the board
        const cards = await t.cards('id', 'name');
        const results = [];

        for (const card of cards) {
            try {
                // Load timer data for this card
                const timerData = await t.get(card.id, 'shared', 'timerData');
                
                if (timerData && timerData.totalTime > 0) {
                    results.push({
                        cardId: card.id,
                        cardName: card.name,
                        totalTime: timerData.totalTime || 0,
                        recentEntries: timerData.recentEntries || [],
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
 * Flattens card data into array of entries with card metadata.
 * @param {Array} cardData - Array from fetchAllCardTimers
 * @returns {Array} Flat array of entries
 */
export const flattenEntries = (cardData) => {
    return cardData.flatMap(card => 
        (card.recentEntries || []).map(entry => ({
            ...entry,
            cardId: card.cardId,
            cardName: card.cardName,
        }))
    );
};

/**
 * Calculates total duration from card data.
 * @param {Array} cardData - Array from fetchAllCardTimers
 * @returns {number} Total duration in milliseconds
 */
export const calculateTotal = (cardData) => {
    return cardData.reduce((sum, card) => sum + (card.totalTime || 0), 0);
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
 * Groups card data by card.
 * @param {Array} cardData - Array from fetchAllCardTimers
 * @returns {Object} Map of cardId to {cardName, totalTime, recentEntries}
 */
export const groupByCard = (cardData) => {
    const grouped = {};

    cardData.forEach(card => {
        grouped[card.cardId] = {
            cardName: card.cardName,
            totalTime: card.totalTime,
            recentEntries: card.recentEntries || [],
        };
    });

    return grouped;
};

/**
 * Generates a CSV string from card data.
 * @param {Array} cardData - Array from fetchAllCardTimers
 * @returns {string} CSV content
 */
export const generateCSV = (cardData) => {
    const headers = ['Card Name', 'Total Time', 'Hours', 'Recent Entries Count'];

    const rows = cardData.map(card => {
        const hours = (card.totalTime / (1000 * 60 * 60)).toFixed(2);
        const durationStr = formatDuration(card.totalTime, { compact: false });
        const entryCount = (card.recentEntries || []).length;

        return [
            `"${card.cardName.replace(/"/g, '""')}"`,
            durationStr,
            hours,
            entryCount
        ].join(',');
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
