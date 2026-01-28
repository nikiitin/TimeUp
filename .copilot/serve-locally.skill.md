---
skill: serve-locally
description: Start a local development server for testing the Power-Up
tags: [development, server, local]
---

# Serve Locally Skill

## Purpose
Start a local HTTP server to test the Power-Up during development.

## Prerequisites
- Node.js installed (for npx)
- OR Python 3 installed (alternative)

## Method 1: Using Node.js (Recommended)

### Start Server
```bash
npx -y serve . -l 8080
```

### Access Points
Once running, the Power-Up files are served at:
- Main connector: `http://localhost:8080/index.html`
- Card button view: `http://localhost:8080/views/card-button.html`
- Card section view: `http://localhost:8080/views/card-section.html`
- Report view: `http://localhost:8080/views/report.html`

## Method 2: Using Python

### Start Server
```bash
python3 -m http.server 8080
```

## Configure Trello Power-Up

### Update Power-Up URL
1. Go to [Trello Power-Up Admin](https://trello.com/power-ups/admin)
2. Select your Power-Up
3. Update the **iframe connector URL** to:
   ```
   http://localhost:8080/index.html
   ```
4. Save changes

## Development Workflow

### Making Changes
1. Edit files in your editor
2. Save changes
3. Refresh Trello page (Ctrl+R / Cmd+R)
4. Changes appear immediately (no build step)

### Debugging
1. Open browser DevTools (F12)
2. Check Console for JavaScript errors
3. Check Network tab for failed requests
4. Use `[ServiceName]` filters to find logs

## Important Notes

- ✅ Changes reflect immediately - no build process
- ✅ `localhost` is allowed for development (HTTPS not required)
- ❌ Production requires HTTPS (use GitHub Pages for deployment)
- 🔄 Refresh Trello page to see changes

## Common Issues

### Port Already in Use
```bash
# Use different port
npx -y serve . -l 8081
```
Then update Trello Power-Up URL to `:8081`

### CORS Errors
Trello allows `localhost` without CORS issues. If you see CORS errors:
- Verify URL in Trello Power-Up settings matches your local URL exactly
- Check that server is actually running on specified port

### Changes Not Appearing
1. Hard refresh Trello page: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Verify server is running (`netstat -an | grep 8080`)
4. Check browser console for JavaScript errors

## Stop Server
Press `Ctrl+C` in the terminal running the server.

## Related Skills
- test-in-trello.skill.md - Test in actual Trello board
- debug.skill.md - Debug issues during development
- deploy.skill.md - Deploy to production
