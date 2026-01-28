---
skill: debug
description: Common debugging patterns for TimeUp Power-Up
tags: [debug, troubleshooting, trello]
---

# Debug Skill

## Purpose

Diagnose and fix common issues in the TimeUp Power-Up.

## Quick Debug Reference

| Symptom            | Likely Cause    | Check                              |
| ------------------ | --------------- | ---------------------------------- |
| Timer won't start  | Already running | Check `timerData.state`            |
| Timer won't stop   | Not running     | Check `timerData.state`            |
| Badge not updating | Static badge    | Use `dynamic` with `refresh`       |
| Data not syncing   | Wrong scope     | Use `'shared'` not `'private'`     |
| UI shows old state | Not refreshing  | Call `t.cards('id')` after changes |

## Browser DevTools Access

### Open Correct Console

Power-Up iframes have their own console:

1. Right-click on the Power-Up section in Trello
2. Select "Inspect" or "Inspect Frame"
3. DevTools opens for that specific iframe

### Check Stored Data

In the iframe console:

```javascript
// Get timer data for current card
TrelloPowerUp.iframe().get("card", "shared", "timerData").then(console.log);

// Get board settings
TrelloPowerUp.iframe()
  .get("board", "shared", "boardSettings")
  .then(console.log);

// Clear timer data (for testing)
TrelloPowerUp.iframe().set("card", "shared", "timerData", null);
```

### Monitor Service Calls

Filter console by service prefixes:

- `[TimerService]`
- `[StorageService]`
- `[ReportService]`
- `[ChecklistService]`
- `[Main]`

## Common Issues & Solutions

### Timer Already Running Error

```javascript
// Check state before calling startTimer
const timerData = await StorageService.getTimerData(t);
if (timerData.state !== TIMER_STATE.RUNNING) {
  await TimerService.startTimer(t);
}
```

### Entry Not Appearing After Stop

```javascript
// Use result.data from stopTimer
const result = await TimerService.stopTimer(t);
if (result.success) {
  renderEntries(result.data.entries); // Use result.data!
}
```

### Badge Shows Wrong Time

```javascript
// ❌ Static badge won't update
{
  text: formatDuration(elapsed);
}

// ✅ Dynamic badge updates every 30s
{
  dynamic: async () => ({
    text: formatDuration(getCurrentElapsed()),
    refresh: 30,
  });
}
```

### Popup Content Cut Off

```javascript
// Resize popup after content changes
entriesList.innerHTML = "...";
t.sizeTo("#container"); // Or t.sizeTo(350)
```

### Card Not Refreshing After Changes

```javascript
// Force card re-render after data change
await t.set("card", "shared", "timerData", newData);
await t.cards("id"); // Triggers re-render
```

## Network Issues

### Check API Calls

1. Open DevTools → Network tab
2. Look for requests to `api.trello.com`
3. Check for 429 (rate limit) or 401 (auth) errors

### Rate Limiting Solutions

- Reduce `refresh` frequency in dynamic badges
- Batch storage operations
- Cache data appropriately

## Test Data States

Reset to specific states for testing:

```javascript
const t = TrelloPowerUp.iframe();

// Empty state
await t.set("card", "shared", "timerData", {
  entries: [],
  state: "idle",
  currentEntry: null,
  estimatedTime: null,
});

// Running state
await t.set("card", "shared", "timerData", {
  entries: [],
  state: "running",
  currentEntry: { startTime: Date.now(), pausedDuration: 0 },
  estimatedTime: null,
});

// With entries
await t.set("card", "shared", "timerData", {
  entries: [
    {
      id: "test1",
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      duration: 3600000,
      description: "Test entry",
      createdAt: Date.now(),
    },
  ],
  state: "idle",
  currentEntry: null,
  estimatedTime: 7200000, // 2 hours
});
```

## Performance Monitoring

- Watch for excessive re-renders (multiple setTimerData calls)
- Check Network tab for API rate limiting
- Verify update intervals are reasonable (1s for display, 30s for badges)

## Related Skills

- test-in-trello.skill.md - Test in actual Trello board
- add-feature.skill.md - Add fixes as features
