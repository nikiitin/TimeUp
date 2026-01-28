---
skill: test-in-trello
description: Test the TimeUp Power-Up in a real Trello board
tags: [testing, trello, integration]
---

# Test in Trello Skill

## Purpose

Test the Power-Up in a real Trello environment to verify functionality.

## Prerequisites

- Power-Up registered at [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
- Local server running OR deployed to GitHub Pages
- Test Trello board available

## One-Time Setup

### 1. Register Power-Up

1. Go to [Trello Power-Up Admin](https://trello.com/power-ups/admin)
2. Create a new Power-Up or select existing one
3. Set **iframe connector URL**:
   - Local: `http://localhost:8080/index.html`
   - Production: `https://yourusername.github.io/TimeUp/index.html`

### 2. Enable Capabilities

Enable these in Power-Up settings:

- ✅ `card-buttons`
- ✅ `card-badges`
- ✅ `card-detail-badges`
- ✅ `card-back-section`
- ✅ `board-buttons`

### 3. Add to Test Board

1. Open a Trello board (create a dedicated test board)
2. Click **Power-Ups** in board menu
3. Find your custom Power-Up
4. Click **Add**

## Testing Workflow

### Test Timer Functions

1. ✅ Open any card
2. ✅ Verify **Time Tracker** section appears
3. ✅ Click **Start** → timer starts counting
4. ✅ Wait a few seconds
5. ✅ Click **Stop** → entry appears in list
6. ✅ Verify badge shows on card front
7. ✅ Close and reopen card → timer state persists

### Test Time Estimates

1. ✅ Enter estimate: `2h 30m` or `150` (minutes)
2. ✅ Click **Set Estimate**
3. ✅ Verify remaining time displays
4. ✅ Add time entries
5. ✅ Verify remaining time decreases
6. ✅ Continue until over 80% → warning color appears
7. ✅ Continue until over budget → danger color appears

### Test Entry Management

1. ✅ Create 3-5 time entries
2. ✅ Verify each shows: date, time, duration
3. ✅ Click **×** button on an entry
4. ✅ Confirm deletion
5. ✅ Verify total time recalculates
6. ✅ Verify badge updates on card front

### Test Board Report

1. ✅ Click **Time Report** in board menu
2. ✅ Select date range (last 7 days)
3. ✅ Click **Load Report**
4. ✅ Verify all cards with time appear
5. ✅ Verify daily grouping
6. ✅ Verify totals are correct
7. ✅ Click **Export CSV**
8. ✅ Open CSV file → verify data format

### Test Multi-User Sync

1. ✅ Open same card in two browser tabs
2. ✅ Start timer in tab 1
3. ✅ Refresh tab 2 → timer shows as running
4. ✅ Stop timer in tab 2
5. ✅ Refresh tab 1 → entry appears

### Test Edge Cases

1. ✅ Start timer, close card, reopen → still running
2. ✅ Create entry with no estimate set
3. ✅ Create entry with estimate = 0
4. ✅ Delete all entries → totals reset to 0
5. ✅ Set estimate, then delete it
6. ✅ Start timer, refresh page immediately

## Debugging During Testing

### Open Console

1. Right-click on Time Tracker section
2. Select **Inspect** or **Inspect Frame**
3. Console opens for Power-Up iframe

### Check Storage

```javascript
// In Power-Up iframe console
TrelloPowerUp.iframe().get("card", "shared", "timerData").then(console.log);
```

### Monitor Logs

Filter console by:

- `[TimerService]`
- `[StorageService]`
- `[ReportService]`
- `[Main]`

### Common Issues

#### Section Not Appearing

- Verify Power-Up is enabled on board
- Check iframe connector URL is correct
- Refresh Trello page hard: `Ctrl+Shift+R`
- Check browser console for errors

#### Timer Not Updating

- Check if using dynamic badge (not static)
- Verify `refresh` property is set
- Check for JavaScript errors in console

#### Data Not Syncing

- Verify using `'shared'` scope (not `'private'`)
- Check Trello API calls succeed (Network tab)
- Test with hard refresh on both tabs

## Test Checklist

Before considering testing complete:

- [ ] Timer starts and stops correctly
- [ ] Entries display with correct data
- [ ] Badges update on card fronts
- [ ] Estimates work and show warnings
- [ ] Deletion removes entries
- [ ] Report loads all card data
- [ ] CSV export works
- [ ] Multi-tab sync works
- [ ] No console errors
- [ ] Page refreshes preserve state

## Related Skills

- serve-locally.skill.md - Run local server
- debug.skill.md - Debug issues found during testing
- deploy.skill.md - Deploy after successful testing
