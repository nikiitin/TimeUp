---
description: Deploy TimeUp to GitHub Pages
---

# Deploy to GitHub Pages

## Prerequisites

- Repository pushed to GitHub
- GitHub Pages enabled in repo settings

## Steps

// turbo

1. Ensure all changes are committed:

```bash
git status
```

// turbo 2. Push to main branch:

```bash
git push origin main
```

3. In GitHub repository settings:
   - Go to **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` (or `gh-pages`)
   - Folder: `/ (root)`
   - Click **Save**

4. Wait 1-2 minutes for deployment

5. Access your Power-Up at:
   `https://{username}.github.io/TimeUp/`

## Update Trello Power-Up

1. Go to [Trello Power-Up Admin](https://trello.com/power-ups/admin)
2. Update the iframe connector URL to:
   `https://{username}.github.io/TimeUp/index.html`
3. Changes take effect immediately for new page loads

## Verify Deployment

// turbo

1. Check deployment status:

```bash
git log -1 --format="%H %s"
```

2. Open the GitHub Pages URL in a browser
3. Verify `index.html` loads without 404
4. Test the Power-Up in Trello

## Troubleshooting

### 404 on pages

- Ensure `index.html` is in the root directory
- Check GitHub Pages source settings

### Old version showing

- Hard refresh the page (Ctrl+Shift+R)
- Check that the commit was pushed
- Wait for GitHub Actions to complete
