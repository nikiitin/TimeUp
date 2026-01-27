# TimeUp

A Trello Power-Up for time tracking, built with pure HTML5, CSS3, and Vanilla JavaScript.

## Features

- ⏱️ Start/Stop timer on any card
- 📊 Track time entries per card
- 🏷️ View total time spent via card badges
- 💾 Data stored in Trello (no external server)

## Tech Stack

- **Zero Build Tools**: Pure ES6 modules, no bundlers
- **Vanilla CSS**: CSS Custom Properties + BEM naming
- **Trello Storage**: Uses `t.set()` / `t.get()` for persistence

## Project Structure

```
├── index.html              # Power-Up connector
├── views/                  # HTML views for capabilities
├── src/
│   ├── main.js             # Power-Up initialization
│   ├── services/           # Business logic
│   ├── ui/                 # DOM manipulation
│   └── utils/              # Pure utilities
├── styles/                 # CSS (variables, base, components)
└── .antigravityrules       # AI coding standards
```

## Development

1. Serve locally: `npx serve .`
2. Add Power-Up in Trello with your localhost URL
3. Test on a Trello board

## Deployment

Push to GitHub and enable GitHub Pages from the `main` branch.

## License

MIT
