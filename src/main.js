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
        return [{
            icon: ICON_TIMER,
            text: 'Time Tracker',
            callback: (t) => t.popup({
                title: 'Time Tracker',
                url: './views/card-button.html',
                height: 300,
            }),
        }];
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
}, {
    appKey: 'timingup',
    appName: APP_INFO.POWER_UP_NAME,
});
