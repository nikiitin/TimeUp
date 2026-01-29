# TimeUp

**A lightweight time tracking Power-Up for Trello**

TimeUp enables seamless time tracking directly within your Trello workflow. Track time spent on individual cards, view detailed time entries, and generate comprehensive reports—all without leaving your board.

---

## Features

### Card-Level Time Tracking

- **One-click timer**: Start and stop timers directly from the card with a single button
- **Persistent tracking**: Timer state is preserved across sessions and devices
- **Automatic entries**: Each timing session is recorded with start time and duration

### Inline Time Display

- **Embedded section**: Timer controls appear directly inside the card, not in a separate popup
- **Live updates**: Running time displays in real-time with automatic refresh
- **Entry history**: View all recorded time entries with date, time, and duration

### Board-Level Reporting

- **Cross-card aggregation**: Combine time data from all cards on the board
- **Date range filtering**: Generate reports for specific time periods
- **Daily summaries**: Entries grouped by date with subtotals
- **CSV export**: Download report data for use in spreadsheets or invoicing

### Visual Indicators

- **Card badges**: Display total time and running status on card fronts
- **Detail badges**: Show accumulated time in card backs
- **Color-coded states**: Green for running, neutral for stopped

---

## Installation

### From Trello Power-Up Directory

1. Open a Trello board
2. Click **Power-Ups** in the board menu
3. Search for **TimeUp**
4. Click **Add** to enable

### Custom Installation (Self-Hosted)

1. Clone this repository
2. Host the files on any static hosting service (GitHub Pages, Netlify, etc.)
3. Register a new Power-Up at [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
4. Configure the following capabilities:
   - Card buttons
   - Card badges
   - Card detail badges
   - Card back section
   - Board buttons

---

## Usage

### Tracking Time

1. Open any card on your board
2. Locate the **Time Tracker** section in the card
3. Click **Start** to begin tracking
4. Click **Stop** when finished—the entry is automatically saved

### Viewing Entries

Time entries appear directly below the timer in each card, showing:

- Date and time when the session started
- Duration of the session
- Running total for the card

### Generating Reports

1. Click **Time Report** in the board header
2. Select a date range using the From/To date pickers
3. Click **Load Report** to view aggregated data
4. Click **Export CSV** to download the data

---

## Technical Details

### Architecture

TimeUp is built as a client-side Trello Power-Up with no external server dependencies:

- **Pure JavaScript (ES6+)**: No frameworks or build steps required
- **Modular design**: Separation of concerns between services, UI, and utilities
- **Trello Storage API**: All data stored via `t.set()` and `t.get()`

### Project Structure

```
TimeUp/
├── index.html              # Power-Up connector
├── views/
│   ├── card-section.html   # Embedded timer UI
│   ├── card-button.html    # Popup timer view
│   └── report.html         # Board-level report
├── src/
│   ├── main.js             # Capability registration
│   ├── services/
│   │   ├── StorageService.js
│   │   ├── TimerService.js
│   │   ├── TrelloService.js
│   │   └── ReportService.js
│   ├── ui/
│   │   └── CardButtonUI.js
│   └── utils/
│       ├── constants.js
│       ├── formatTime.js
│       └── validators.js
└── styles/
    ├── variables.css
    ├── base.css
    └── components.css
```

### Data Storage

Timer data is stored per-card using Trello's shared scope:

```javascript
{
  state: 'idle' | 'running',
  startTime: number | null,
  entries: [
    { startTime: number, duration: number }
  ]
}
```

### Browser Compatibility

TimeUp supports all modern browsers:

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

## Development

### Prerequisites

- A Trello account
- A registered Power-Up at [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
- A static file server (or GitHub Pages)

### Local Development

1. Clone the repository
2. Serve files locally (e.g., `npx serve .`)
3. Register a development Power-Up pointing to your local URL
4. Enable the Power-Up on a test board

### Contributing

Contributions are welcome. Please ensure:

- Code follows the existing style conventions
- All functions include JSDoc documentation
- CSS uses BEM naming convention
- No external dependencies are introduced

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Support

For issues, feature requests, or questions, please open an issue on the [GitHub repository](https://github.com/nikiitin/TimeUp).
