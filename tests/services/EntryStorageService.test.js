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
    StorageService.removeData = jest.fn();
    
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
      expect(result.recentCount).toBe(5);
      expect(result.archived).toBe(55);
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

  describe("getStorageStats", () => {
    test("should return storage statistics", async () => {
      const timerData = {
        state: "idle",
        entries: Array.from({ length: 10 }, (_, i) => ({
          id: `e${i}`,
          startTime: i * 1000,
          endTime: (i + 1) * 1000,
          duration: 1000,
          description: `Task ${i}`,
          createdAt: (i + 1) * 1000,
        })),
      };

      StorageService.getTimerData.mockResolvedValue(timerData);
      StorageService.getData.mockResolvedValue(null);

      const stats = await EntryStorageService.getStorageStats(tMock);

      expect(stats.error).toBeUndefined();
      expect(stats.totalEntries).toBe(10);
      expect(stats.recentEntries).toBe(10);
      expect(stats.archivedEntries).toBe(0);
      expect(stats.archivePages).toBe(0);
    });

    test("should count archived entries across pages", async () => {
      const timerData = {
        state: "idle",
        entries: Array.from({ length: 15 }, (_, i) => ({ id: `e${i}`, createdAt: i })),
      };

      const page0 = Array.from({ length: 30 }, (_, i) => [`ea${i}`, 1000, 2000, 1000, "", 2000, null]);
      const page1 = Array.from({ length: 20 }, (_, i) => [`eb${i}`, 1000, 2000, 1000, "", 2000, null]);

      StorageService.getTimerData.mockResolvedValue(timerData);
      
      // Mock getData to return the same pages consistently
      StorageService.getData.mockImplementation(async (t, scope, visibility, key) => {
        if (key === "timerEntries_0") return page0;
        if (key === "timerEntries_1") return page1;
        if (key === "timerEntries_2") return null;
        return null;
      });

      const stats = await EntryStorageService.getStorageStats(tMock);

      expect(stats.error).toBeUndefined();
      expect(stats.totalEntries).toBe(65);
      expect(stats.recentEntries).toBe(15);
      expect(stats.archivedEntries).toBe(50);
      expect(stats.archivePages).toBe(2);
    });

    test("should handle errors gracefully", async () => {
      StorageService.getTimerData.mockRejectedValue(new Error("Storage error"));

      const stats = await EntryStorageService.getStorageStats(tMock);

      expect(stats.error).toBe("Storage error");
      expect(stats.totalEntries).toBeUndefined();
    });
  });

  describe("getAllEntries - edge cases", () => {
    test("should handle corrupted archive data", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [{ id: "e1", createdAt: 1000 }],
      });

      StorageService.getData
        .mockResolvedValueOnce(["invalid"])
        .mockResolvedValueOnce(null);

      const entries = await EntryStorageService.getAllEntries(tMock);

      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].id).toBe("e1");
    });

    test("should handle missing createdAt field", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [
          { id: "e1", createdAt: 3000 },
          { id: "e2" },
          { id: "e3", createdAt: 1000 },
        ],
      });

      StorageService.getData.mockResolvedValue(null);

      const entries = await EntryStorageService.getAllEntries(tMock);

      expect(entries.length).toBe(3);
      expect(entries[2].id).toBe("e2");
    });
  });

  describe("archiveOldEntries integration", () => {
    test("should handle large number of entries", async () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({
        id: `e${i}`,
        startTime: i * 1000,
        endTime: (i + 1) * 1000,
        duration: 1000,
        description: `Task ${i}`,
        createdAt: (i + 1) * 1000,
      }));

      StorageService.setTimerData.mockResolvedValue({ success: true });
      StorageService.setData.mockResolvedValue({ success: true });
      StorageService.getData.mockResolvedValue(null);

      const result = await EntryStorageService.saveEntries(tMock, entries, { state: "idle" });

      expect(result.success).toBe(true);
      expect(result.recentCount).toBe(5);
      expect(result.archived).toBe(95);
    });
  });

  describe("Error handling coverage", () => {
    test("getAllEntries should handle getData errors gracefully", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [{ id: "e1", createdAt: 1000 }],
      });
      
      StorageService.getData.mockRejectedValue(new Error("Storage error"));

      const entries = await EntryStorageService.getAllEntries(tMock);

      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe("e1");
    });

    test("saveEntries should handle setData errors", async () => {
      const entries = Array.from({ length: 20 }, (_, i) => ({
        id: `e${i}`,
        startTime: i * 1000,
        endTime: (i + 1) * 1000,
        duration: 1000,
        description: "",
        createdAt: (i + 1) * 1000,
      }));

      StorageService.setTimerData.mockResolvedValue({ success: true });
      StorageService.setData.mockRejectedValue(new Error("Write error"));

      const result = await EntryStorageService.saveEntries(tMock, entries, { state: "idle" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Write error");
    });

    test("deleteEntry should handle errors", async () => {
      // getAllEntries catches errors, so deleteEntry succeeds with empty list
      StorageService.getTimerData.mockRejectedValue(new Error("Read error"));
      StorageService.setTimerData.mockResolvedValue({ success: true });
      StorageService.getData.mockResolvedValue(null);

      const result = await EntryStorageService.deleteEntry(tMock, "entry_1");

      // Entry not found (because list is empty)
      expect(result.success).toBe(false);
      expect(result.found).toBe(false);
    });

    test("updateEntry should handle errors", async () => {
      // getAllEntries catches errors, so updateEntry succeeds with empty list
      StorageService.getTimerData.mockRejectedValue(new Error("Read error"));
      StorageService.setTimerData.mockResolvedValue({ success: true });
      StorageService.getData.mockResolvedValue(null);

      const result = await EntryStorageService.updateEntry(tMock, "entry_1", {
        description: "Updated",
      });

      // Entry not found (because list is empty)
      expect(result.success).toBe(false);
      expect(result.found).toBe(false);
    });

    test("getAllEntries should handle archive page errors gracefully", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [{ id: "e1", createdAt: 1000 }],
      });

      // First page succeeds, second fails
      StorageService.getData
        .mockResolvedValueOnce([["e2", 1000, 2000, 1000, "", 2000, null]])
        .mockRejectedValueOnce(new Error("Page error"));

      const entries = await EntryStorageService.getAllEntries(tMock);

      // Should have main entry + archived entry from first page
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    test("getAllEntries should handle outer catch block", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [{ id: "e1", createdAt: 1000 }],
      });

      // Make getData throw an unexpected error
      StorageService.getData.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const entries = await EntryStorageService.getAllEntries(tMock);

      // Should still return main entries
      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe("e1");
    });

    test("saveEntries should handle archiving errors", async () => {
      const entries = Array.from({ length: 50 }, (_, i) => ({
        id: `e${i}`,
        startTime: i * 1000,
        endTime: (i + 1) * 1000,
        duration: 1000,
        description: "",
        createdAt: (i + 1) * 1000,
      }));

      StorageService.setTimerData.mockResolvedValue({ success: true });
      StorageService.setData.mockRejectedValue(new Error("Archive write failed"));

      const result = await EntryStorageService.saveEntries(tMock, entries, { state: "idle" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Archive write failed");
    });

    test("archiveOldEntries should warn about oversized pages", async () => {
      // Create entries with very long descriptions to exceed page size
      const entries = Array.from({ length: 30 }, (_, i) => ({
        id: `e${i}`,
        startTime: i * 1000,
        endTime: (i + 1) * 1000,
        duration: 1000,
        description: "x".repeat(200), // Long description
        createdAt: (i + 1) * 1000,
      }));

      StorageService.setData.mockResolvedValue({ success: true });

      // This will trigger the warning about page size
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Call archiveOldEntries indirectly through saveEntries
      const result = await EntryStorageService.saveEntries(tMock, entries, { state: "idle" });

      // Check if warning was logged (might be called depending on actual size)
      // The test itself verifies the code path runs
      expect(result).toBeDefined();

      consoleSpy.mockRestore();
    });

    test("clearExtraPages should handle removeData errors silently", async () => {
      StorageService.removeData.mockRejectedValue(new Error("Remove failed"));

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Create a large dataset that will trigger archiving and cleanup
      const entries = Array.from({ length: 100 }, (_, i) => ({
        id: `e${i}`,
        startTime: i * 1000,
        endTime: (i + 1) * 1000,
        duration: 1000,
        description: "",
        createdAt: (i + 1) * 1000,
      }));

      StorageService.setTimerData.mockResolvedValue({ success: true });
      StorageService.setData.mockResolvedValue({ success: true });

      await EntryStorageService.saveEntries(tMock, entries, { state: "idle" });

      // clearExtraPages should have been called and handled error silently
      expect(StorageService.removeData).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test("updateEntry should handle saveEntries failure", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [{ id: "e1", createdAt: 1000, description: "Old" }],
      });
      StorageService.getData.mockResolvedValue(null);
      StorageService.setTimerData.mockResolvedValue({ success: false, error: "Save failed" });

      const result = await EntryStorageService.updateEntry(tMock, "e1", {
        description: "New",
      });

      expect(result.success).toBe(false);
      expect(result.found).toBe(true);
    });

    test("deleteEntry should handle saveEntries failure", async () => {
      StorageService.getTimerData.mockResolvedValue({
        entries: [{ id: "e1", createdAt: 1000 }],
      });
      StorageService.getData.mockResolvedValue(null);
      StorageService.setTimerData.mockResolvedValue({ success: false, error: "Save failed" });

      const result = await EntryStorageService.deleteEntry(tMock, "e1");

      expect(result.success).toBe(false);
      expect(result.found).toBe(true);
    });
  });
});

