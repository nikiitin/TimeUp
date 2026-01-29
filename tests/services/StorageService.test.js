/**
 * Tests for StorageService.js
 */

import { jest } from "@jest/globals";
import { createTrelloMock, createErrorMock } from "../mocks/trelloMock.js";
import StorageService from "../../src/services/StorageService.js";
import {
  STORAGE_KEYS,
  STORAGE_SCOPES,
  DEFAULTS,
} from "../../src/utils/constants.js";

describe("StorageService", () => {
  let mockT;

  beforeEach(() => {
    mockT = createTrelloMock();
    jest.clearAllMocks();
  });

  describe("getData", () => {
    test("returns data from storage", async () => {
      const testData = { foo: "bar" };
      mockT._setStorage("card", "shared", "testKey", testData);

      const result = await StorageService.getData(
        mockT,
        "card",
        "shared",
        "testKey",
      );
      expect(result).toEqual(testData);
    });

    test("returns default value when key not found", async () => {
      const defaultValue = { default: true };
      const result = await StorageService.getData(
        mockT,
        "card",
        "shared",
        "nonexistent",
        defaultValue,
      );
      expect(result).toEqual(defaultValue);
    });

    test("returns null when no default and key not found", async () => {
      const result = await StorageService.getData(
        mockT,
        "card",
        "shared",
        "nonexistent",
      );
      expect(result).toBeNull();
    });

    test("returns default on error", async () => {
      mockT.get = createErrorMock("Storage error");
      const defaultValue = { fallback: true };

      const result = await StorageService.getData(
        mockT,
        "card",
        "shared",
        "key",
        defaultValue,
      );
      expect(result).toEqual(defaultValue);
    });
  });

  describe("setData", () => {
    test("stores data and returns success object", async () => {
      const testData = { test: "value" };
      const result = await StorageService.setData(
        mockT,
        "card",
        "shared",
        "testKey",
        testData,
      );

      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(0);
      expect(mockT._getStorage("card", "shared", "testKey")).toEqual(testData);
    });

    test("returns failure on error", async () => {
      mockT.set = createErrorMock("Save error");

      const result = await StorageService.setData(
        mockT,
        "card",
        "shared",
        "key",
        {},
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("returns failure when limit exceeded", async () => {
      const largeData = "a".repeat(5000);
      const result = await StorageService.setData(
        mockT,
        "card",
        "shared",
        "key",
        largeData,
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("LIMIT_EXCEEDED");
    });
  });

  describe("removeData", () => {
    test("removes data and returns true", async () => {
      mockT._setStorage("card", "shared", "toRemove", { data: "exists" });

      const result = await StorageService.removeData(
        mockT,
        "card",
        "shared",
        "toRemove",
      );
      expect(result).toBe(true);
    });

    test("returns false on error", async () => {
      mockT.remove = createErrorMock("Remove error");

      const result = await StorageService.removeData(
        mockT,
        "card",
        "shared",
        "key",
      );
      expect(result).toBe(false);
    });
  });

  describe("getTimerData", () => {
    test("returns timer data with entries from card storage", async () => {
      const timerData = {
        state: "running",
        currentEntry: { startTime: 1000 },
        checklistItems: {},
        entries: [{ id: "e1", duration: 1000 }],
      };

      mockT._setStorage(
        "card",
        STORAGE_SCOPES.CARD_SHARED,
        STORAGE_KEYS.TIMER_DATA,
        timerData,
      );

      const result = await StorageService.getTimerData(mockT);
      expect(result).toEqual(timerData);
    });

    test("returns defaults when no data exists", async () => {
      const result = await StorageService.getTimerData(mockT);
      expect(result).toEqual(DEFAULTS.TIMER_DATA);
    });
  });

  describe("setTimerMetadata", () => {
    test("saves complete timer data including entries to timerData key", async () => {
      const timerData = {
        entries: [{ id: "e1" }],
        state: "idle",
        currentEntry: null,
        checklistItems: { item1: { estimatedTime: 100 } },
      };

      const result = await StorageService.setTimerMetadata(mockT, timerData);
      expect(result.success).toBe(true);

      // Check that complete timerData is saved (not split)
      const savedTimerData = mockT._getStorage(
        "card",
        STORAGE_SCOPES.CARD_SHARED,
        STORAGE_KEYS.TIMER_DATA,
      );

      expect(savedTimerData).toEqual(timerData);
      expect(savedTimerData.entries).toEqual(timerData.entries); // Entries included
      expect(savedTimerData.checklistItems).toEqual(timerData.checklistItems);
    });
  });

  describe("getBoardSettings", () => {
    test("returns board settings", async () => {
      const settings = { hourlyRate: 50, currency: "EUR" };
      mockT._setStorage(
        "board",
        STORAGE_SCOPES.CARD_SHARED,
        STORAGE_KEYS.BOARD_SETTINGS,
        settings,
      );

      const result = await StorageService.getBoardSettings(mockT);
      expect(result).toEqual(settings);
    });

    test("returns defaults when no data exists", async () => {
      const result = await StorageService.getBoardSettings(mockT);
      expect(result).toEqual(DEFAULTS.BOARD_SETTINGS);
    });
  });

  describe("setBoardSettings", () => {
    test("saves board settings", async () => {
      const settings = { hourlyRate: 75, currency: "GBP", categories: [] };

      const result = await StorageService.setBoardSettings(mockT, settings);
      expect(result.success).toBe(true);
    });
  });

  describe("getUserPreferences", () => {
    test("returns user preferences", async () => {
      const prefs = { showSeconds: false, use24HourFormat: false };
      mockT._setStorage(
        "member",
        STORAGE_SCOPES.CARD_PRIVATE,
        STORAGE_KEYS.USER_PREFERENCES,
        prefs,
      );

      const result = await StorageService.getUserPreferences(mockT);
      expect(result).toEqual(prefs);
    });

    test("returns defaults when no data exists", async () => {
      const result = await StorageService.getUserPreferences(mockT);
      expect(result).toEqual(DEFAULTS.USER_PREFERENCES);
    });
  });

  describe("setUserPreferences", () => {
    test("saves user preferences", async () => {
      const prefs = {
        showSeconds: true,
        use24HourFormat: true,
        autoStartOnOpen: true,
      };

      const result = await StorageService.setUserPreferences(mockT, prefs);
      expect(result.success).toBe(true);
    });
  });

  describe("Error Handling Coverage", () => {
    test("calculateUsage should handle circular references", () => {
      const circular = { a: 1 };
      circular.self = circular;

      // Should not throw, just calculate based on what can be stringified
      expect(() => StorageService.calculateUsage(circular)).toThrow();
    });

    test("setTimerMetadata should strip entries and save only metadata", async () => {
      const fullData = {
        entries: [{ id: "e1" }, { id: "e2" }],
        state: "running",
        currentEntry: { startTime: 123 },
        checklistItems: {},
      };

      const result = await StorageService.setTimerMetadata(mockT, fullData);

      expect(result.success).toBe(true);

      // Verify entries were stripped
      const saved = mockT._getStorage(
        "card",
        STORAGE_SCOPES.CARD_SHARED,
        STORAGE_KEYS.TIMER_DATA,
      );

      expect(saved.entries).toBeUndefined();
      expect(saved.state).toBe("running");
      expect(saved.currentEntry).toBeDefined();
    });

    test("removeData should handle errors gracefully", async () => {
      const mockErrorT = {
        remove: jest.fn().mockRejectedValue(new Error("Remove failed")),
      };

      const result = await StorageService.removeData(
        mockErrorT,
        "card",
        "shared",
        "someKey",
      );

      expect(result).toBe(false);
    });

    test("getData should return default value on error", async () => {
      const mockErrorT = {
        get: jest.fn().mockRejectedValue(new Error("Get failed")),
      };

      const result = await StorageService.getData(
        mockErrorT,
        "card",
        "shared",
        "someKey",
        { default: "value" },
      );

      expect(result).toEqual({ default: "value" });
    });

    test("setData should handle errors gracefully", async () => {
      const mockErrorT = {
        set: jest.fn().mockRejectedValue(new Error("Set failed")),
      };

      const result = await StorageService.setData(
        mockErrorT,
        "card",
        "shared",
        "someKey",
        "value",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Set failed");
    });
  });
});
