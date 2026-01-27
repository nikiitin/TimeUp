/**
 * TimingUp - Time Formatting Utilities
 * Pure functions for formatting time values
 */

import { TIME } from './constants.js';

/**
 * Pads a number with leading zeros to reach the desired length.
 * @param {number} num - The number to pad
 * @param {number} [length=2] - Desired string length
 * @returns {string} Zero-padded number string
 * @example
 * padZero(5) // "05"
 * padZero(123, 4) // "0123"
 */
export const padZero = (num, length = 2) => {
    return String(Math.floor(num)).padStart(length, '0');
};

/**
 * Formats milliseconds into a human-readable duration string.
 * @param {number} ms - Duration in milliseconds
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.showSeconds=true] - Include seconds in output
 * @param {boolean} [options.compact=false] - Use compact format (1h 30m vs 01:30:00)
 * @param {boolean} [options.showDays=false] - Show days for long durations
 * @returns {string} Formatted duration string
 * @example
 * formatDuration(8130000) // "02:15:30"
 * formatDuration(8130000, { compact: true }) // "2h 15m 30s"
 * formatDuration(90061000, { showDays: true }) // "1d 1h 1m 1s"
 */
export const formatDuration = (ms, options = {}) => {
    const {
        showSeconds = true,
        compact = false,
        showDays = false,
    } = options;

    if (typeof ms !== 'number' || ms < 0 || !Number.isFinite(ms)) {
        return compact ? '0m' : '00:00';
    }

    const totalSeconds = Math.floor(ms / TIME.SECOND);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    if (compact) {
        const parts = [];
        if (showDays && days > 0) parts.push(`${days}d`);
        if (hours > 0 || (showDays && days > 0)) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        if (showSeconds) parts.push(`${seconds}s`);
        return parts.join(' ');
    }

    // Standard format: HH:MM:SS or HH:MM
    if (showDays && days > 0) {
        return showSeconds
            ? `${days}d ${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`
            : `${days}d ${padZero(hours)}:${padZero(minutes)}`;
    }

    const totalHours = days * 24 + hours;
    return showSeconds
        ? `${padZero(totalHours)}:${padZero(minutes)}:${padZero(seconds)}`
        : `${padZero(totalHours)}:${padZero(minutes)}`;
};

/**
 * Formats a timestamp to a localized time string.
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.use24Hour=true] - Use 24-hour format
 * @param {boolean} [options.showDate=false] - Include date in output
 * @returns {string} Formatted time string
 * @example
 * formatTimestamp(1706367600000) // "14:30"
 * formatTimestamp(1706367600000, { use24Hour: false }) // "2:30 PM"
 */
export const formatTimestamp = (timestamp, options = {}) => {
    const { use24Hour = true, showDate = false } = options;

    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
        return '--:--';
    }

    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
        return '--:--';
    }

    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24Hour,
    };

    if (showDate) {
        timeOptions.year = 'numeric';
        timeOptions.month = 'short';
        timeOptions.day = 'numeric';
    }

    return date.toLocaleString(undefined, timeOptions);
};

/**
 * Calculates the elapsed time from a start timestamp to now.
 * @param {number} startTime - Start timestamp in milliseconds
 * @returns {number} Elapsed time in milliseconds
 * @example
 * // If current time is 1000ms after startTime
 * getElapsedTime(Date.now() - 1000) // 1000
 */
export const getElapsedTime = (startTime) => {
    if (typeof startTime !== 'number' || !Number.isFinite(startTime)) {
        return 0;
    }
    return Math.max(0, Date.now() - startTime);
};

/**
 * Sums up durations from an array of time entries.
 * @param {Array<{duration: number}>} entries - Array of time entries
 * @returns {number} Total duration in milliseconds
 * @example
 * sumDurations([{ duration: 1000 }, { duration: 2000 }]) // 3000
 */
export const sumDurations = (entries) => {
    if (!Array.isArray(entries)) {
        return 0;
    }

    return entries.reduce((total, entry) => {
        const duration = entry?.duration;
        if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
            return total + duration;
        }
        return total;
    }, 0);
};
