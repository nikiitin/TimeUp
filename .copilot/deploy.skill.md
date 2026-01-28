---
skill: deploy
description: Deploy TimeUp to GitHub Pages
tags: [deployment, github-pages, production]
---

# Deploy Skill

## Purpose

Deploy the TimeUp Power-Up to GitHub Pages for production use.

## Prerequisites

- Repository pushed to GitHub
- GitHub Pages enabled in repository settings

## Deployment Steps

### 1. Verify All Changes Committed

```bash
git status
```

Ensure output shows:

```
nothing to commit, working tree clean
```

If there are uncommitted changes, commit them first:

```bash
git add .
git commit -m "feat: description of changes"
```

### 2. Push to Main Branch

```bash
git push origin main
```

### 3. Enable GitHub Pages (First Time Only)

1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Pages** in left sidebar
4. Under **Source**:
   - Branch: `main` (or `gh-pages`)
   - Folder: `/ (root)`
   - Click **Save**

### 4. Wait for Deployment

- Deployment takes 1-2 minutes
- Check status at: `https://github.com/{username}/TimeUp/actions`
- Wait for green checkmark

### 5. Verify Deployment URL

Your Power-Up is now live at:

```
https://{username}.github.io/TimeUp/
```

Test by visiting:

```
https://{username}.github.io/TimeUp/index.html
```

## Update Trello Power-Up

### Configure Production URL

1. Go to [Trello Power-Up Admin](https://trello.com/power-ups/admin)
2. Select your Power-Up
3. Update **iframe connector URL** to:
   ```
   https://{username}.github.io/TimeUp/index.html
   ```
4. Click **Save**
5. Changes take effect immediately for new page loads

## Verify Production Deployment

### Test in Trello

1. Open a test board
2. Enable the Power-Up
3. Open a card
4. Verify Time Tracker section appears
5. Test all core functionality:
   - Start/stop timer
   - View entries
   - Set estimates
   - Generate report

### Check for Errors

1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Verify all assets load correctly

## Post-Deployment Checklist

- [ ] Power-Up loads in Trello
- [ ] No 404 errors for assets
- [ ] Timer functionality works
- [ ] Data persists correctly
- [ ] No console errors
- [ ] All views accessible
- [ ] Report generation works
- [ ] CSV export works

## Troubleshooting

### 404 Errors on Pages

**Problem**: Pages return 404 Not Found

**Solution**:

1. Verify `index.html` is in repository root
2. Check GitHub Pages source settings
3. Ensure branch name matches (main vs gh-pages)
4. Wait 2-3 minutes for cache to clear

### Old Version Showing

**Problem**: Changes not appearing in production

**Solution**:

1. Hard refresh page: `Ctrl+Shift+R` or `Cmd+Shift+R`
2. Verify commit was pushed: `git log -1`
3. Check GitHub Actions completed successfully
4. Clear browser cache
5. Wait for CDN cache to expire (up to 10 minutes)

### Assets Not Loading

**Problem**: CSS/JS files return 404

**Solution**:

1. Check file paths are relative (not absolute)
2. Verify case-sensitive filenames match
3. Check `.gitignore` isn't excluding files
4. Verify files are committed to repository

### Power-Up Not Loading in Trello

**Problem**: Blank section or error in Trello

**Solution**:

1. Verify iframe connector URL is exactly correct
2. Check HTTPS (not HTTP) in production URL
3. Test URL directly in browser
4. Check browser console for errors
5. Verify Power-Up is enabled on the board

## Rollback Procedure

If deployment breaks functionality:

### 1. Identify Last Working Commit

```bash
git log --oneline
```

### 2. Revert to Last Working Version

```bash
git revert HEAD
git push origin main
```

### 3. Or Reset to Specific Commit

```bash
git reset --hard <commit-hash>
git push origin main --force
```

## Continuous Deployment

### Automatic Deployment

Every push to `main` automatically deploys to GitHub Pages.

### Manual Deployment

If you need to trigger manually:

1. Go to repository → **Actions** tab
2. Select **pages build and deployment** workflow
3. Click **Re-run all jobs**

## Related Skills

- test-in-trello.skill.md - Test before deploying
- serve-locally.skill.md - Test locally first
- debug.skill.md - Debug production issues
