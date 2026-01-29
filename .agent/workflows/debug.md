---
description: Common debugging patterns for TimeUp Power-Up
---

# Debugging TimeUp

## Quick Debug Checklist

| Symptom            | Likely Cause        | Check                              |
| ------------------ | ------------------- | ---------------------------------- |
| Timer won't start  | Already running     | Check `timerData.state`            |
| Timer won't stop   | Not running         | Check `timerData.state`            |
| Badge not updating | Static badge used   | Use `dynamic` with `refresh`       |
| Data not syncing   | Wrong storage scope | Use `'shared'` not `'private'`     |
| UI shows old state | Not refreshing      | Call `t.cards('id')` after changes |

## Browser DevTools

### Open the Right Console

Power-Up iframes have their own console. To access:

1. Right-click on the Power-Up section in Trello
2. Select "Inspect" or "Inspect Frame"
3. This opens DevTools for that specific iframe

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

All services log errors with prefixes. Filter console by:

- `[TimerService]`
- `[StorageService]`
- `[ReportService]`
- `[Main]`

## Common Issues

### "Timer already running" error

```javascript
// Before calling startTimer, check state:
const timerData = await StorageService.getTimerData(t);
if (timerData.state !== TIMER_STATE.RUNNING) {
  await TimerService.startTimer(t);
}
```

### Entry not appearing after stop

Check that `stopTimer` result is used:

```javascript
const result = await TimerService.stopTimer(t);
if (result.success) {
  renderEntries(result.data.entries); // Use result.data!
}
```

### Badge shows wrong time

Ensure dynamic badge is used:

```javascript
// ❌ Wrong - static, won't update
{
  text: formatDuration(elapsed);
}

// ✅ Correct - dynamic, updates every 30s
{
  dynamic: async () => ({
    text: formatDuration(getCurrentElapsed()),
    refresh: 30,
  });
}
```

### Popup too small / content cut off

Use `t.sizeTo()` after content changes:

```javascript
entriesList.innerHTML = "...";
t.sizeTo("#container"); // Resize to fit
```

## Network Issues

### Check API Calls

1. Open DevTools → Network tab
2. Look for requests to `api.trello.com`
3. Check for 429 (rate limit) or 401 (auth) errors

### Rate Limiting

If you see 429 errors:

- Reduce `refresh` frequency in dynamic badges
- Batch storage operations where possible
- Cache data when appropriate

## Testing Data States

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
      description: "",
      createdAt: Date.now(),
    },
  ],
  state: "idle",
  currentEntry: null,
  estimatedTime: 7200000, // 2 hours
});
```
