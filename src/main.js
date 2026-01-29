/**
 * TimeUp - Main Power-Up Initialization
 * Registers all Power-Up capabilities with Trello
 */

import { TIMER_STATE, APP_INFO, BADGE_COLORS } from "./utils/constants.js";
import { AppConfig } from "./config/AppConfig.js";
import { formatDuration, getRemainingTime } from "./utils/formatTime.js";
import StorageService from "./services/StorageService.js";
import TimerService from "./services/TimerService.js";
import { getRunningCheckItem } from "./services/ChecklistService.js";

console.log("[TimeUp] main.js loaded - initializing Power-Up");

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
    "card-badges": async (t) => {
      console.log("[TimeUp] card-badges called");
      try {
        const timerData = await StorageService.getTimerData(t);
        console.log("[TimeUp] card-badges timerData:", timerData.state, "running:", timerData.state === TIMER_STATE.RUNNING);
        const badges = [];

        // Check if any timer is running (global or checklist)
        const isGlobalRunning = timerData.state === TIMER_STATE.RUNNING;
        const runningCheckItem = getRunningCheckItem(timerData);
        const isAnyTimerRunning = isGlobalRunning || runningCheckItem.isRunning;

        // Show total time badge ONLY when a timer is running (dynamic, real-time update)
        if (isAnyTimerRunning) {
          // Calculate elapsed for display
          let currentElapsed = 0;
          if (isGlobalRunning) {
            currentElapsed = TimerService.getCurrentElapsed(timerData);
          } else if (runningCheckItem.isRunning && runningCheckItem.itemId) {
            const itemData = timerData.checklistTotals?.[runningCheckItem.itemId];
            if (itemData) {
              currentElapsed = TimerService.getItemCurrentElapsed(itemData);
            }
          }
          const displayTotal = timerData.totalTime + currentElapsed;

          // Use dynamic badge for real-time updates
          badges.push({
            dynamic: async () => {
              const freshData = await StorageService.getTimerData(t);
              const freshRunning = getRunningCheckItem(freshData);
              const stillRunning = freshData.state === TIMER_STATE.RUNNING || freshRunning.isRunning;

              if (!stillRunning) {
                // Timer stopped, hide badge
                return null;
              }

              let elapsed = 0;
              if (freshData.state === TIMER_STATE.RUNNING) {
                elapsed = TimerService.getCurrentElapsed(freshData);
              } else if (freshRunning.isRunning && freshRunning.itemId) {
                const itemData = freshData.checklistTotals?.[freshRunning.itemId];
                if (itemData) {
                  elapsed = TimerService.getItemCurrentElapsed(itemData);
                }
              }

              return {
                text: formatDuration(freshData.totalTime + elapsed, { compact: true, showSeconds: false }),
                color: BADGE_COLORS.RUNNING,
                icon: ICON_TIMER,
                refresh: 30,
              };
            },
          });
        }

        // Show remaining time if estimate is set
        const remainingInfo = getRemainingTime(
          timerData.totalTime,
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

        if (timerData.totalTime === 0 && timerData.state === TIMER_STATE.IDLE) {
          return [];
        }

        return [
          {
            title: "Total Time",
            text: formatDuration(timerData.totalTime, { compact: true }),
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
  },
  {
    appKey: AppConfig.APP_KEY,
    appName: AppConfig.APP_NAME,
  },
);
