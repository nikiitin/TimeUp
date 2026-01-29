/**
 * TimeUp - Main Power-Up Initialization
 * Registers all Power-Up capabilities with Trello
 */

import { TIMER_STATE, APP_INFO, BADGE_COLORS } from "./utils/constants.js";
import { AppConfig } from "./config/AppConfig.js";
import {
  formatDuration,
  sumDurations,
  getRemainingTime,
} from "./utils/formatTime.js";
import StorageService from "./services/StorageService.js";
import TimerService from "./services/TimerService.js";
import AttachmentStorageService from "./services/AttachmentStorageService.js";

// SVG clock icon (works well on dark backgrounds)
const ICON_TIMER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23b6c2cf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  );

/**
 * Initializes the Trello Power-Up with all capabilities.
 */
/* global TrelloPowerUp */
TrelloPowerUp.initialize(
  {
    "card-buttons": async (t) => {
      const timerData = await StorageService.getTimerData(t);
      const isRunning = timerData.state === TIMER_STATE.RUNNING;

      return [
        {
          // Quick toggle button - one click to start/stop
          icon: isRunning
            ? "https://cdn-icons-png.flaticon.com/512/1828/1828778.png" // stop icon
            : "https://cdn-icons-png.flaticon.com/512/727/727245.png", // play icon
          text: isRunning ? "⏹ Stop Timer" : "▶ Start Timer",
          callback: async (t) => {
            try {
              if (isRunning) {
                await TimerService.stopTimer(t);
              } else {
                await TimerService.startTimer(t);
              }
            } catch (error) {
              console.error("[Main] Toggle timer error:", error);
            }
          },
        },
        {
          icon: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png",
          text: "🔧 Storage Diagnostic",
          callback: (t) =>
            t.popup({
              title: "Storage Diagnostic",
              url: "./views/diagnostic.html",
              height: 600,
            }),
        },
      ];
    },

    "card-badges": async (t) => {
      try {
        const timerData = await StorageService.getTimerData(t);
        // Load entries from attachment storage for badge calculations
        const entries = await AttachmentStorageService.getAllEntries(t);
        const badges = [];

        // Show running indicator
        if (timerData.state === TIMER_STATE.RUNNING) {
          const elapsed = TimerService.getCurrentElapsed(timerData);
          badges.push({
            dynamic: async () => ({
              text: formatDuration(
                TimerService.getCurrentElapsed(
                  await StorageService.getTimerData(t),
                ),
                { compact: true },
              ),
              color: BADGE_COLORS.RUNNING,
              refresh: 30,
            }),
          });
        }

        // Show total time if entries exist
        const total = sumDurations(entries);
        if (total > 0) {
          badges.push({
            text: formatDuration(total, { compact: true, showSeconds: false }),
            color: BADGE_COLORS.DEFAULT,
            icon: ICON_TIMER,
          });
        }

        // Show remaining time if estimate is set
        const remainingInfo = getRemainingTime(
          entries,
          timerData.estimatedTime,
        );
        if (remainingInfo) {
          let color = BADGE_COLORS.DEFAULT;
          let text = "";
          if (remainingInfo.isOverBudget) {
            color = BADGE_COLORS.OVER_BUDGET;
            text = `${formatDuration(Math.abs(remainingInfo.remaining), { compact: true, showSeconds: false })} over`;
          } else if (remainingInfo.percentComplete >= 80) {
            color = BADGE_COLORS.WARNING;
            text = `${formatDuration(remainingInfo.remaining, { compact: true, showSeconds: false })} left`;
          } else {
            text = `${formatDuration(remainingInfo.remaining, { compact: true, showSeconds: false })} left`;
          }
          badges.push({ text, color });
        }

        return badges;
      } catch (error) {
        console.error("[Main] card-badges error:", error);
        return [];
      }
    },

    "card-detail-badges": async (t) => {
      try {
        const timerData = await StorageService.getTimerData(t);
        // Load entries from attachment storage
        const entries = await AttachmentStorageService.getAllEntries(t);
        const total = sumDurations(entries);

        if (total === 0 && timerData.state === TIMER_STATE.IDLE) {
          return [];
        }

        return [
          {
            title: "Total Time",
            text: formatDuration(total, { compact: true }),
            color:
              timerData.state === TIMER_STATE.RUNNING
                ? BADGE_COLORS.RUNNING
                : null,
          },
        ];
      } catch (error) {
        console.error("[Main] card-detail-badges error:", error);
        return [];
      }
    },

    // Embed timer section directly inside the card
    "card-back-section": async (t) => {
      return {
        title: "Time Tracker",
        icon: ICON_TIMER,
        content: {
          type: "iframe",
          url: t.signUrl("./views/card-section.html?v=4"),
          height: 180,
        },
      };
    },

    // Board-level report button
    "board-buttons": async (t) => {
      return [
        {
          text: "Time Report",
          callback: (t) =>
            t.popup({
              title: "Time Report",
              url: "./views/report.html",
              height: 500,
            }),
        },
      ];
    },
  },
  {
    appKey: AppConfig.APP_KEY,
    appName: AppConfig.APP_NAME,
  },
);
