import { jest } from "@jest/globals";
import EntryStorageService from "../../src/services/EntryStorageService.js";
import StorageService from "../../src/services/StorageService.js";

jest.mock("../../src/services/StorageService.js");

describe("EntryStorageService", () => {
  let tMock;

  beforeEach(() => {
    tMock = { t: "mock" };
    
    // Setup mocks
    StorageService.getTimerData = jest.fn();
    StorageService.setTimerData = jest.fn();
    StorageService.getData = jest.fn();
    StorageService.setData = jest.fn();
    
    jest.clearAllMocks();
  });

  describe("compressEntry / decompressEntry", () => {
    test("should compress entry to array format", () => {
      const entry = {
        id: "entry_123",
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        description: "Test task",
        createdAt: 2000,
        checklistItemId: "item_456",
      };

      const compressed = EntryStorageService.compressEntry(entry);

      expect(Array.isArray(compressed)).toBe(true);
      expect(compressed.length).toBe(7);
      expect(compressed[0]).toBe("entry_123");
      expect(compressed[1]).toBe(1000);
      expect(compressed[6]).toBe("item_456");
    });

    test("should decompress array back to entry", () => {
      const compressed = [
        "entry_123",
        1000,
        2000,
        1000,
        "Test task",
        2000,
        "item_456",
      ];

      const entry = EntryStorageService.decompressEntry(compressed);

      expect(entry.id).toBe("entry_123");
      expect(entry.startTime).toBe(1000);
      expect(entry.duration).toBe(1000);
      expect(entry.description).toBe("Test task");
      expect(entry.checklistItemId).toBe("item_456");
    });

    test("should handle entry without checklistItemId", () => {
      const entry = {
        id: "entry_789",
        startTime: 3000,
        endTime: 4000,
        duration: 1000,
        description: "No checklist",
        createdAt: 4000,
      };

      const compressed = EntryStorageService.compressEntry(entry);
      const decompressed = EntryStorageService.decompressEntry(compressed);

      expect(decompressed.checklistItemId).toBe(null);
    });

    test("should return null for invalid compressed data", () => {
      expect(EntryStorageService.decompressEntry(null)).toBe(null);
      expect(EntryStorageService.decompressEntry([])).toBe(null);
      expect(EntryStorageService.decompressEntry([1, 2])).toBe(null);
    });
  });

  describe("getAllEntries", () => {
    test("should return entries from timerData", async () => {
      const mockEntries = [
        { id: "e1", startTime: 1000, createdAt: 1000 },
        { id: "e2", startTime: 2000, createdAt: 2000 },
      ];

      StorageService.getTimerData.mockResolvedValue({
        entries: mockEntries,
        state: "idle",
      });

      const entries = await EntryStorageService.getAllEntries(tMock);

      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe("e2"); // Sorted by createdAt desc
      expect(entries[1].id).toBe("e1");
    });

    test("should return empty array if no entries", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [],
        state: "idle",
      });

      const entries = await EntryStorageService.getAllEntries(tMock);

      expect(entries).toEqual([]);
    });

    test("should handle errors gracefully", async () => {
      StorageService.getTimerData.mockRejectedValue(
        new Error("Storage error"),
      );

      const entries = await EntryStorageService.getAllEntries(tMock);

      expect(entries).toEqual([]);
    });
  });

  describe("saveEntries", () => {
    test("should save entries successfully", async () => {
      const entries = [
        {
          id: "e1",
          startTime: 1000,
          endTime: 2000,
          duration: 1000,
          description: "Task 1",
          createdAt: 2000,
        },
      ];

      const timerData = {
        state: "idle",
        currentEntry: null,
      };

      StorageService.setTimerData.mockResolvedValue({ success: true });

      const result = await EntryStorageService.saveEntries(
        tMock,
        entries,
        timerData,
      );

      expect(result.success).toBe(true);
      expect(StorageService.setTimerData).toHaveBeenCalled();
    });

    test("should split entries between recent and archived", async () => {
      // Create 60 entries (15 recent + 45 archived)
      const entries = Array.from({ length: 60 }, (_, i) => ({
        id: `e${i}`,
        startTime: i * 1000,
        endTime: (i + 1) * 1000,
        duration: 1000,
        description: `Task ${i}`,
        createdAt: (i + 1) * 1000,
      }));

      const timerData = { state: "idle", currentEntry: null };

      StorageService.setTimerData.mockResolvedValue({ success: true });
      StorageService.setData.mockResolvedValue({ success: true });

      const result = await EntryStorageService.saveEntries(
        tMock,
        entries,
        timerData,
      );

      expect(result.success).toBe(true);
      expect(result.recentCount).toBe(15);
      expect(result.archived).toBe(45);
    });

    test("should handle save errors", async () => {
      const entries = [{ id: "e1", createdAt: 1000 }];
      const timerData = { state: "idle" };

      StorageService.setTimerData.mockResolvedValue({
        success: false,
        error: "Storage full",
      });

      const result = await EntryStorageService.saveEntries(
        tMock,
        entries,
        timerData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage full");
    });
  });

  describe("deleteEntry", () => {
    test("should delete entry by ID", async () => {
      const entries = [
        { id: "e1", startTime: 1000, createdAt: 1000 },
        { id: "e2", startTime: 2000, createdAt: 2000 },
      ];

      StorageService.getTimerData
        .mockResolvedValueOnce({ entries, state: "idle" })
        .mockResolvedValueOnce({ entries: [], state: "idle" });

      StorageService.setTimerData.mockResolvedValue({ success: true });

      const result = await EntryStorageService.deleteEntry(tMock, "e1");

      expect(result.success).toBe(true);
      expect(result.found).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe("e2");
    });

    test("should return not found for non-existent entry", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [],
        state: "idle",
      });

      const result = await EntryStorageService.deleteEntry(
        tMock,
        "nonexistent",
      );

      expect(result.found).toBe(false);
    });
  });

  describe("updateEntry", () => {
    test("should update entry fields", async () => {
      const entries = [
        {
          id: "e1",
          startTime: 1000,
          duration: 1000,
          description: "Old",
          createdAt: 1000,
        },
      ];

      StorageService.getTimerData
        .mockResolvedValueOnce({ entries, state: "idle" })
        .mockResolvedValueOnce({ entries: [], state: "idle" });

      StorageService.setTimerData.mockResolvedValue({ success: true });

      const result = await EntryStorageService.updateEntry(tMock, "e1", {
        description: "Updated",
        duration: 2000,
      });

      expect(result.success).toBe(true);
      expect(result.found).toBe(true);
      expect(result.entries[0].description).toBe("Updated");
      expect(result.entries[0].duration).toBe(2000);
    });

    test("should return not found for non-existent entry", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [],
        state: "idle",
      });

      const result = await EntryStorageService.updateEntry(
        tMock,
        "nonexistent",
        { description: "Test" },
      );

      expect(result.found).toBe(false);
    });
  });

  describe("Storage efficiency", () => {
    test("compression should reduce size by ~40%", () => {
      const entry = {
        id: "entry_1706410800000_abc123def",
        startTime: 1706410800000,
        endTime: 1706414400000,
        duration: 3600000,
        description: "Working on feature X",
        createdAt: 1706414400000,
        checklistItemId: "checkitem-abc123def456",
      };

      const originalSize = JSON.stringify(entry).length;
      const compressed = EntryStorageService.compressEntry(entry);
      const compressedSize = JSON.stringify(compressed).length;

      const reduction = ((originalSize - compressedSize) / originalSize) * 100;

      expect(reduction).toBeGreaterThan(35); // At least 35% reduction
      expect(compressedSize).toBeLessThan(originalSize * 0.65);
    });
  });
});
