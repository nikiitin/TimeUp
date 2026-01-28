import { jest } from "@jest/globals";
import TimerService from "../../src/services/TimerService.js";
import StorageService from "../../src/services/StorageService.js";
import { TIMER_STATE, DEFAULTS } from "../../src/utils/constants.js";

// Mock StorageService
jest.mock("../../src/services/StorageService.js");

describe("TimerService", () => {
  let tMock;

  // Helper to generate fresh mock data
  const getMockData = () => ({
    entries: [],
    checklistItems: {},
    state: TIMER_STATE.IDLE,
    currentEntry: null,
  });

  beforeEach(() => {
    tMock = { t: "mock" };

    // Mock methods on the default export object
    StorageService.getTimerData = jest.fn().mockResolvedValue(getMockData());
    StorageService.setTimerData = jest.fn().mockResolvedValue(true);

    jest.clearAllMocks();
  });

  describe("startTimer (Global)", () => {
    test("should start timer if idle", async () => {
      const result = await TimerService.startTimer(tMock);

      expect(result.success).toBe(true);
      expect(result.data.state).toBe(TIMER_STATE.RUNNING);
      expect(result.data.currentEntry).toBeDefined();
      expect(StorageService.setTimerData).toHaveBeenCalled();
    });

    test("should fail if already running", async () => {
      StorageService.getTimerData.mockResolvedValue({
        ...getMockData(),
        state: TIMER_STATE.RUNNING,
      });

      const result = await TimerService.startTimer(tMock);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Timer already running");
    });

    test("should stop running checklist item before starting", async () => {
      const runningItemData = {
        ...getMockData(),
        checklistItems: {
          item1: {
            state: TIMER_STATE.RUNNING,
            currentEntry: { startTime: Date.now() - 1000 },
            entries: [],
          },
        },
      };
      StorageService.getTimerData.mockResolvedValue(runningItemData);

      const result = await TimerService.startTimer(tMock);

      expect(result.success).toBe(true);
      expect(result.stoppedItemId).toBe("item1");
      // Global should be running now
      expect(result.data.state).toBe(TIMER_STATE.RUNNING);
      // Item should be idle
      expect(result.data.checklistItems["item1"].state).toBe(TIMER_STATE.IDLE);
      // Entry should have been created for item
      expect(result.data.checklistItems["item1"].entries.length).toBe(1);
    });
  });

  describe("startItemTimer", () => {
    test("should start item timer and stop global timer", async () => {
      const runningGlobalData = {
        ...getMockData(),
        state: TIMER_STATE.RUNNING,
        currentEntry: { startTime: Date.now() - 1000 },
      };
      StorageService.getTimerData.mockResolvedValue(runningGlobalData);

      const result = await TimerService.startItemTimer(tMock, "item1");

      expect(result.success).toBe(true);
      expect(result.stoppedGlobal).toBe(true);
      // Global should be idle
      expect(result.data.state).toBe(TIMER_STATE.IDLE);
      // Item should be running
      expect(result.data.checklistItems["item1"].state).toBe(
        TIMER_STATE.RUNNING,
      );
    });
  });

  describe("Data Integrity (deleteEntry)", () => {
    test("should clean up entries from both lists", async () => {
      const entryId = "e1";
      const itemId = "item1";
      const entry = { id: entryId, checklistItemId: itemId, duration: 100 };

      const dataWithEntry = {
        entries: [entry],
        checklistItems: {
          [itemId]: {
            entries: [entry],
          },
        },
      };
      StorageService.getTimerData.mockResolvedValue(dataWithEntry);

      const result = await TimerService.deleteEntry(tMock, entryId);

      expect(result.success).toBe(true);
      expect(result.data.entries.length).toBe(0); // Removed from global
      expect(result.data.checklistItems[itemId].entries.length).toBe(0); // Removed from item
    });
  });
});
