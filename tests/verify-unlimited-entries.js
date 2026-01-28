/**
 * Manual verification test for unlimited entries feature
 * This simulates saving 100 entries and verifies pagination works
 */

import EntryStorageService from "../src/services/EntryStorageService.js";
import StorageService from "../src/services/StorageService.js";
import { DEFAULTS } from "../src/utils/constants.js";

// Create mock Trello client
const createMockT = () => {
  const storage = new Map();
  
  return {
    _storage: storage,
    async get(scope, visibility, key) {
      const storageKey = `${scope}/${visibility}${key ? `/${key}` : ''}`;
      if (key) {
        return storage.get(storageKey);
      }
      // Get all keys with this prefix
      const result = {};
      for (const [k, v] of storage.entries()) {
        if (k.startsWith(storageKey)) {
          const keyName = k.substring(storageKey.length + 1);
          result[keyName] = v;
        }
      }
      return result;
    },
    async set(scope, visibility, key, value) {
      const storageKey = `${scope}/${visibility}/${key}`;
      const serialized = JSON.stringify(value);
      if (serialized.length > 4096) {
        throw new Error("Storage limit exceeded");
      }
      storage.set(storageKey, value);
      return;
    },
    async remove(scope, visibility, key) {
      const storageKey = `${scope}/${visibility}/${key}`;
      storage.delete(storageKey);
      return;
    },
    _getStorage(scope, visibility, key) {
      return storage.get(`${scope}/${visibility}/${key}`);
    },
    _getAllKeys() {
      return Array.from(storage.keys());
    }
  };
};

// Create sample entries
const createEntry = (index) => ({
  id: `e_${index}_${Math.random().toString(36).substr(2, 4)}`,
  startTime: 1000000 + (index * 10000),
  endTime: 1000000 + (index * 10000) + 5000,
  duration: 5000,
  description: `Task ${index}`,
  createdAt: 1000000 + (index * 10000) + 5000,
  checklistItemId: null,
});

async function runTest() {
  console.log("🧪 Testing Unlimited Entries Feature\n");
  console.log("=" .repeat(60));
  
  const mockT = createMockT();
  
  // Test 1: Save 100 entries
  console.log("\n📝 Test 1: Saving 100 entries...");
  const entries = [];
  for (let i = 0; i < 100; i++) {
    entries.push(createEntry(i));
  }
  
  const timerData = {
    ...DEFAULTS.TIMER_DATA,
    entries: entries,
  };
  
  const saveResult = await EntryStorageService.saveEntries(mockT, entries, timerData);
  
  if (saveResult.success) {
    console.log(`✅ Successfully saved ${entries.length} entries`);
    console.log(`   - Recent entries in main storage: ${saveResult.recentCount}`);
    console.log(`   - Archived entries: ${saveResult.archived}`);
  } else {
    console.error(`❌ Save failed: ${saveResult.error}`);
    return;
  }
  
  // Test 2: Verify storage structure
  console.log("\n📦 Test 2: Checking storage structure...");
  const allKeys = mockT._getAllKeys();
  console.log(`   Storage keys created: ${allKeys.length}`);
  allKeys.forEach(key => {
    const data = mockT._storage.get(key);
    const size = JSON.stringify(data).length;
    console.log(`   - ${key}: ${size} bytes`);
  });
  
  // Test 3: Retrieve all entries
  console.log("\n🔍 Test 3: Retrieving all entries...");
  const retrievedEntries = await EntryStorageService.getAllEntries(mockT);
  console.log(`   Retrieved ${retrievedEntries.length} entries`);
  
  if (retrievedEntries.length === 100) {
    console.log(`✅ All 100 entries retrieved successfully`);
  } else {
    console.error(`❌ Expected 100 entries, got ${retrievedEntries.length}`);
  }
  
  // Test 4: Verify entry integrity
  console.log("\n🔬 Test 4: Verifying entry integrity...");
  const firstEntry = retrievedEntries.find(e => e.id === entries[0].id);
  const lastEntry = retrievedEntries.find(e => e.id === entries[99].id);
  
  if (firstEntry && lastEntry) {
    console.log(`✅ First and last entries intact`);
    console.log(`   First: ${firstEntry.description} (${firstEntry.duration}ms)`);
    console.log(`   Last: ${lastEntry.description} (${lastEntry.duration}ms)`);
  } else {
    console.error(`❌ Entry integrity check failed`);
  }
  
  // Test 5: Check storage efficiency
  console.log("\n📊 Test 5: Storage efficiency analysis...");
  const timerDataKey = mockT._getStorage("card", "shared", "timerData");
  const timerDataSize = JSON.stringify(timerDataKey).length;
  const totalStorageUsed = allKeys.reduce((sum, key) => {
    return sum + JSON.stringify(mockT._storage.get(key)).length;
  }, 0);
  
  console.log(`   timerData size: ${timerDataSize} bytes (${(timerDataSize/4096*100).toFixed(1)}% of 4KB limit)`);
  console.log(`   Total storage used: ${totalStorageUsed} bytes across ${allKeys.length} keys`);
  console.log(`   Average per entry: ${(totalStorageUsed/100).toFixed(0)} bytes`);
  
  if (timerDataSize < 4096) {
    console.log(`✅ timerData within 4KB limit`);
  } else {
    console.error(`❌ timerData exceeds 4KB limit!`);
  }
  
  // Test 6: Delete an entry from archive
  console.log("\n🗑️  Test 6: Deleting entry from archive...");
  const entryToDelete = entries[75]; // Should be in archive
  const deleteResult = await EntryStorageService.deleteEntry(mockT, entryToDelete.id);
  
  if (deleteResult.success) {
    console.log(`✅ Successfully deleted entry ${entryToDelete.id}`);
    const afterDelete = await EntryStorageService.getAllEntries(mockT);
    console.log(`   Remaining entries: ${afterDelete.length}`);
    
    if (afterDelete.length === 99) {
      console.log(`✅ Entry count correct after deletion`);
    }
  } else {
    console.error(`❌ Delete failed: ${deleteResult.error}`);
  }
  
  // Final summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 UNLIMITED ENTRIES TEST COMPLETE");
  console.log("=" .repeat(60));
  console.log(`\n✅ Capacity: ${entries.length} entries stored and retrieved`);
  console.log(`✅ Storage: Distributed across ${allKeys.length} keys`);
  console.log(`✅ Efficiency: ~${(totalStorageUsed/entries.length).toFixed(0)} bytes per entry`);
  console.log(`✅ 4KB Limit: Bypassed using pagination\n`);
}

// Run the test
runTest().catch(console.error);
