---
description: Test the TimeUp Power-Up in a real Trello board
---

# Test TimeUp in Trello

## Prerequisites

- Power-Up registered at [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
- Local server running (see `/serve-locally`)

## Setup (One-Time)

1. Go to [Trello Power-Up Admin](https://trello.com/power-ups/admin)
2. Create or select your Power-Up
3. Set the **iframe connector URL** to your server URL:
   - Local: `http://localhost:8080/index.html`
   - Production: `https://yourdomain.github.io/TimeUp/index.html`
4. Enable these capabilities:
   - `card-buttons`
   - `card-badges`
   - `card-detail-badges`
   - `card-back-section`
   - `board-buttons`

## Testing Workflow

### Test Timer Functions

1. Open a test board in Trello
2. Enable the Power-Up on the board
3. Open any card
4. Verify the **Time Tracker** section appears
5. Click **Start** → timer should start counting
6. Click **Stop** → entry should appear in list
7. Verify badge shows on card front

### Test Time Estimates

1. Enter an estimate in the input field (e.g., "2h 30m")
2. Click **Set Estimate**
3. Verify remaining time displays correctly
4. Add more time entries
5. Verify remaining time updates and shows warnings at 80%+

### Test Entry Deletion

1. Create several time entries
2. Click the × button on an entry
3. Confirm deletion
4. Verify total time recalculates

### Test Board Report

1. Click **Time Report** in board header
2. Select date range
3. Click **Load Report**
4. Verify all cards with time appear
5. Test **Export CSV**

## Debugging

Open browser DevTools (F12) → Console:

- Filter by `[TimerService]`, `[StorageService]`, etc.
- Check for errors during operations

To inspect stored data, in the card popup iframe console:

```javascript
TrelloPowerUp.iframe().get("card", "shared", "timerData").then(console.log);
```
