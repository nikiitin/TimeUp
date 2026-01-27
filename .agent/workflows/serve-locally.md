---
description: Start a local development server for testing the Power-Up
---

# Serve TimeUp Locally

## Prerequisites
- Node.js installed (for npx)
- Or Python 3 installed (alternative)

## Steps

// turbo
1. Start a local HTTP server on port 8080:
```bash
npx -y serve . -l 8080
```

2. The Power-Up files are now served at:
   - Main connector: `http://localhost:8080/index.html`
   - Card button view: `http://localhost:8080/views/card-button.html`
   - Card section view: `http://localhost:8080/views/card-section.html`
   - Report view: `http://localhost:8080/views/report.html`

3. In your Trello Power-Up admin, update the iframe connector URL to:
   `http://localhost:8080/index.html`

## Alternative: Python Server

// turbo
```bash
python3 -m http.server 8080
```

## Notes
- Changes to files are reflected immediately (no build step)
- Check browser console for JavaScript errors
- Trello requires HTTPS for production; localhost is allowed for development
