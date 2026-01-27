/**
 * TimeUp - Main Power-Up Initialization
 * Registers all Power-Up capabilities with Trello
 */

import { TIMER_STATE, APP_INFO, BADGE_COLORS } from './utils/constants.js';
import { formatDuration, sumDurations } from './utils/formatTime.js';
import StorageService from './services/StorageService.js';
import TimerService from './services/TimerService.js';

const ICON_TIMER = 'https://cdn-icons-png.flaticon.com/512/2838/2838590.png';

/**
 * Initializes the Trello Power-Up with all capabilities.
 */
/* global TrelloPowerUp */
TrelloPowerUp.initialize({
    'card-buttons': async (t) => {
        const timerData = await StorageService.getTimerData(t);
        const isRunning = timerData.state === TIMER_STATE.RUNNING;

        return [
            {
                // Quick toggle button - one click to start/stop
                icon: isRunning
                    ? 'https://cdn-icons-png.flaticon.com/512/1828/1828778.png' // stop icon
                    : 'https://cdn-icons-png.flaticon.com/512/727/727245.png',  // play icon
                text: isRunning ? '⏹ Stop Timer' : '▶ Start Timer',
                callback: async (t) => {
                    try {
                        if (isRunning) {
                            await TimerService.stopTimer(t);
                        } else {
                            await TimerService.startTimer(t);
                        }
                        // Refresh the card to update badges and button
                        await t.cards('id');
                    } catch (error) {
                        console.error('[Main] Toggle timer error:', error);
                    }
                },
            },
            {
                // Detailed view button
                icon: ICON_TIMER,
                text: 'Time Entries',
                callback: (t) => t.popup({
                    title: 'Time Tracker',
                    url: './views/card-button.html',
                    height: 350,
                }),
            },
        ];
    },

    'card-badges': async (t) => {
        try {
            const timerData = await StorageService.getTimerData(t);
            const badges = [];

            // Show running indicator
            if (timerData.state === TIMER_STATE.RUNNING) {
                const elapsed = TimerService.getCurrentElapsed(timerData);
                badges.push({
                    dynamic: async () => ({
                        text: formatDuration(TimerService.getCurrentElapsed(
                            await StorageService.getTimerData(t)
                        ), { compact: true }),
                        color: BADGE_COLORS.RUNNING,
                        refresh: 30,
                    }),
                });
            }

            // Show total time if entries exist
            const total = sumDurations(timerData.entries);
            if (total > 0) {
                badges.push({
                    text: formatDuration(total, { compact: true, showSeconds: false }),
                    color: BADGE_COLORS.DEFAULT,
                    icon: ICON_TIMER,
                });
            }

            return badges;
        } catch (error) {
            console.error('[Main] card-badges error:', error);
            return [];
        }
    },

    'card-detail-badges': async (t) => {
        try {
            const timerData = await StorageService.getTimerData(t);
            const total = sumDurations(timerData.entries);

            if (total === 0 && timerData.state === TIMER_STATE.IDLE) {
                return [];
            }

            return [{
                title: 'Total Time',
                text: formatDuration(total, { compact: true }),
                color: timerData.state === TIMER_STATE.RUNNING ? BADGE_COLORS.RUNNING : null,
                callback: (t) => t.popup({
                    title: 'Time Entries',
                    url: './views/card-button.html',
                    height: 400,
                }),
            }];
        } catch (error) {
            console.error('[Main] card-detail-badges error:', error);
            return [];
        }
    },

    // Embed timer section directly inside the card
    'card-back-section': async (t) => {
        return {
            title: '⏱️ Time Tracker',
            icon: ICON_TIMER,
            content: {
                type: 'iframe',
                url: t.signUrl('./views/card-section.html'),
                height: 200,
            },
        };
    },
}, {
    appKey: 'timingup',
    appName: APP_INFO.POWER_UP_NAME,
});
