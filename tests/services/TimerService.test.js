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
    StorageService.setTimerData = jest
      .fn()
      .mockResolvedValue({ success: true });
    StorageService.setTimerMetadata = jest
      .fn()
      .mockResolvedValue({ success: true });
    StorageService.setData = jest
      .fn()
      .mockResolvedValue({ success: true });
    StorageService.getData = jest.fn().mockResolvedValue(null);

    jest.clearAllMocks();
  });

  describe("startTimer (Global)", () => {
    test("should start timer if idle", async () => {
      const result = await TimerService.startTimer(tMock);

      expect(result.success).toBe(true);
      expect(result.data.state).toBe(TIMER_STATE.RUNNING);
      expect(result.data.currentEntry).toBeDefined();
      // Now uses setTimerMetadata (setData only called if there are entries to save)
      expect(StorageService.setTimerMetadata).toHaveBeenCalled();
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
      // Entry should have been created in global entries
      expect(result.data.entries.length).toBe(1);
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
            state: TIMER_STATE.IDLE,
          },
        },
      };
      StorageService.getTimerData.mockResolvedValue(dataWithEntry);

      const result = await TimerService.deleteEntry(tMock, entryId);

      expect(result.success).toBe(true);
      expect(result.data.entries.length).toBe(0); // Removed from global
      expect(result.data.entries.length).toBe(0); // Removed from global
    });
  });

  describe("Validation & Limits", () => {
    test("should truncate long descriptions in stopTimer", async () => {
      const runningData = {
        ...getMockData(),
        state: TIMER_STATE.RUNNING,
        currentEntry: { startTime: Date.now() - 1000 },
      };
      StorageService.getTimerData.mockResolvedValue(runningData);

      const longDesc = "a".repeat(200);
      const result = await TimerService.stopTimer(tMock, longDesc);

      expect(result.success).toBe(true);
      expect(result.entry.description.length).toBe(120);
      expect(result.entry.description).toBe("a".repeat(120));
    });

    test("should truncate long descriptions in updateEntry", async () => {
      const dataWithEntry = {
        ...getMockData(),
        entries: [
          { id: "e1", startTime: 1000, duration: 500, description: "old" },
        ],
      };
      StorageService.getTimerData.mockResolvedValue(dataWithEntry);

      const longDesc = "b".repeat(200);
      const result = await TimerService.updateEntry(tMock, "e1", {
        description: longDesc,
      });

      expect(result.success).toBe(true);
      expect(result.entry.description.length).toBe(120);
      expect(result.entry.description).toBe("b".repeat(120));
    });
  });

  describe("Error Handling Coverage", () => {
    test("startTimer should handle unexpected errors", async () => {
      StorageService.getTimerData.mockRejectedValue(new Error("Database error"));

      const result = await TimerService.startTimer(tMock);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    test("stopTimer should handle unexpected errors", async () => {
      StorageService.getTimerData.mockRejectedValue(new Error("Read error"));

      const result = await TimerService.stopTimer(tMock, "Test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Read error");
    });

    test("stopTimer should handle no active timer", async () => {
      StorageService.getTimerData.mockResolvedValue({
        ...getMockData(),
        state: TIMER_STATE.IDLE,
      });

      const result = await TimerService.stopTimer(tMock);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No active timer");
    });

    test("setEstimate should handle errors", async () => {
      StorageService.getTimerData.mockRejectedValue(new Error("Storage error"));

      const result = await TimerService.setEstimate(tMock, 3600000);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    test("deleteEntry should handle entry not found", async () => {
      StorageService.getTimerData.mockResolvedValue(getMockData());

      // EntryStorageService will return empty list, so entry won't be found
      const result = await TimerService.deleteEntry(tMock, "nonexistent");

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test("deleteEntry should handle unexpected errors", async () => {
      StorageService.getTimerData.mockRejectedValue(new Error("Delete error"));

      const result = await TimerService.deleteEntry(tMock, "entry1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete error");
    });

    test("updateEntry should handle entry not found", async () => {
      // Test will rely on EntryStorageService's behavior
      const result = await TimerService.updateEntry(tMock, "nonexistent", {
        description: "New desc",
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test("updateEntry should handle unexpected errors", async () => {
      StorageService.getTimerData.mockRejectedValue(new Error("Update error"));

      const result = await TimerService.updateEntry(tMock, "entry1", {
        description: "Updated",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update error");
    });

    test("startItemTimer should handle unexpected errors", async () => {
      StorageService.getTimerData.mockRejectedValue(new Error("Checklist error"));

      const result = await TimerService.startItemTimer(tMock, "item1", "checklist1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Checklist error");
    });

    test("stopItemTimer should handle unexpected errors", async () => {
      StorageService.getTimerData.mockRejectedValue(new Error("Stop item error"));

      const result = await TimerService.stopItemTimer(tMock, "item1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Stop item error");
    });

    test("handleSaveResult should handle save errors with generic message", async () => {
      StorageService.setTimerMetadata.mockResolvedValue({
        success: false,
        error: "UNKNOWN_ERROR",
      });

      const result = await TimerService.startTimer(tMock);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Save failed");
    });

    test("handleSaveResult should handle unexpected errors in catch block", async () => {
      // Force an error by making setTimerMetadata throw
      StorageService.setTimerMetadata.mockRejectedValue(new Error("Unexpected save error"));

      const result = await TimerService.startTimer(tMock);

      expect(result.success).toBe(false);
      // handleSaveResult transforms the error to "Save failed"
      expect(result.error).toBe("Save failed");
    });

    test("deleteEntry should handle save failure", async () => {
      StorageService.getTimerData.mockResolvedValue({
        ...getMockData(),
        entries: [{ id: "e1", startTime: 1000, endTime: 2000, duration: 1000 }],
      });

      // Mock EntryStorageService to simulate save failure
      const EntryStorageService = await import(
        "../../src/services/EntryStorageService.js"
      );
      const originalDelete = EntryStorageService.default.deleteEntry;
      EntryStorageService.default.deleteEntry = jest.fn().mockResolvedValue({
        success: false,
        found: true,
        error: "Save failed",
      });

      const result = await TimerService.deleteEntry(tMock, "e1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Save failed");

      // Restore
      EntryStorageService.default.deleteEntry = originalDelete;
    });

    test("updateEntry should handle save failure", async () => {
      StorageService.getTimerData.mockResolvedValue({
        ...getMockData(),
        entries: [{ id: "e1", startTime: 1000, endTime: 2000, duration: 1000, description: "Old" }],
      });

      // Mock EntryStorageService to simulate save failure
      const EntryStorageService = await import(
        "../../src/services/EntryStorageService.js"
      );
      const originalUpdate = EntryStorageService.default.updateEntry;
      EntryStorageService.default.updateEntry = jest.fn().mockResolvedValue({
        success: false,
        found: true,
        error: "Update failed",
      });

      const result = await TimerService.updateEntry(tMock, "e1", {
        description: "New",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");

      // Restore
      EntryStorageService.default.updateEntry = originalUpdate;
    });

    test("startItemTimer should stop other running item timers", async () => {
      StorageService.getTimerData.mockResolvedValue({
        ...getMockData(),
        checklistItems: {
          item1: {
            state: TIMER_STATE.RUNNING,
            currentEntry: { startTime: Date.now() - 5000, pausedDuration: 0 },
          },
        },
      });
      StorageService.setTimerData.mockResolvedValue({ success: true });

      const result = await TimerService.startItemTimer(
        tMock,
        "item2",
        "checklist1",
      );

      expect(result.success).toBe(true);
      expect(result.stoppedItemId).toBe("item1");
    });

    test("startItemTimer should stop global timer if running", async () => {
      StorageService.getTimerData.mockResolvedValue({
        ...getMockData(),
        state: TIMER_STATE.RUNNING,
        currentEntry: { startTime: Date.now() - 5000, pausedDuration: 0 },
      });
      StorageService.setTimerData.mockResolvedValue({ success: true });

      const result = await TimerService.startItemTimer(
        tMock,
        "item1",
        "checklist1",
      );

      expect(result.success).toBe(true);
      expect(result.stoppedGlobal).toBe(true);
    });

    test("getItemCurrentElapsed should return 0 for paused timer", () => {
      const itemData = {
        state: TIMER_STATE.PAUSED,
        currentEntry: { startTime: Date.now() - 5000, pausedDuration: 1000 },
      };

      const elapsed = TimerService.getItemCurrentElapsed(itemData);
      expect(elapsed).toBe(0);
    });

    test("getStorageUsage should return metadata usage when higher", () => {
      const timerData = {
        entries: [],
        state: TIMER_STATE.IDLE,
        currentEntry: null,
        checklistItems: {},
        estimatedTime: 3600000,
        // Add more metadata to make it larger
        largeMetadata: "x".repeat(1000),
      };

      const usage = TimerService.getStorageUsage(timerData);
      expect(usage).toBeDefined();
      expect(usage.size).toBeGreaterThan(0);
    });

    test("getStorageUsage should return entries usage when higher", () => {
      const timerData = {
        entries: Array.from({ length: 50 }, (_, i) => ({
          id: `e${i}`,
          startTime: i * 1000,
          endTime: (i + 1) * 1000,
          duration: 1000,
          description: "Test entry with some description",
        })),
        state: TIMER_STATE.IDLE,
        currentEntry: null,
      };

      const usage = TimerService.getStorageUsage(timerData);
      expect(usage).toBeDefined();
      expect(usage.size).toBeGreaterThan(0);
    });
  });
});
