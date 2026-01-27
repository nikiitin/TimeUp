# TimeUp - Agent Rules

## Pre-Commit Review Checklist

Before committing any code changes, verify the following:

### 1. Security Review
- [ ] **XSS Prevention**: All user or external data inserted into HTML must be escaped
  - Use `textContent` instead of `innerHTML` when possible
  - If `innerHTML` is required, escape HTML entities: `"<>&` → `&lt;&gt;&amp;`
  - Checklist names, item names, and any Trello data must be sanitized
- [ ] **No sensitive data exposure**: No API keys, tokens, or secrets in code
- [ ] **Input validation**: All user inputs are validated before processing

### 2. Error Handling - No Silent Failures
- [ ] **All async operations must handle errors explicitly**
  - Services should return `{ success, error, data }` pattern
  - UI code must check `success` and display errors to user
- [ ] **User notification required**: Any operation failure must be communicated
  - Use `alert()` for immediate feedback (or better UI notification later)
  - Never just `console.error()` without user feedback
- [ ] **Check for silent catch blocks**: `catch(e) { return []; }` is NOT acceptable in UI code

### 3. Performance Review
- [ ] **Avoid redundant API calls in refresh loops**
  - `getChecklists()` should NOT be called on every 1-second refresh
  - Cache expensive data and only refresh when user interacts
- [ ] **DOM operations should be minimized in loops**
  - Batch DOM updates where possible
  - Avoid re-rendering entire sections when small updates suffice
- [ ] **Check for memory leaks**
  - Event listeners must be removed when elements are destroyed
  - Intervals must be cleared when leaving the view

### 4. Code Quality
- [ ] **No trailing whitespace**
- [ ] **Consistent error message format**
- [ ] **JSDoc for all public functions**

---

## Common Patterns

### Proper Error Handling in UI
```javascript
// ❌ WRONG - Silent failure
const handleAction = async () => {
  await SomeService.doSomething(t);
  await refresh();
};

// ✅ CORRECT - User notification
const handleAction = async () => {
  const result = await SomeService.doSomething(t);
  if (!result.success) {
    alert(`Operation failed: ${result.error}`);
    return;
  }
  await refresh();
};
```

### XSS Prevention
```javascript
// ❌ WRONG - XSS vulnerability
html += `<span>${item.name}</span>`;

// ✅ CORRECT - Escape HTML
const escapeHtml = (str) => str.replace(/[<>&"]/g, c => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'
})[c]);
html += `<span>${escapeHtml(item.name)}</span>`;
```

### Efficient Refresh
```javascript
// ❌ WRONG - API call on every refresh
const refresh = async () => {
  const data = await StorageService.getData(t);
  const checklists = await ChecklistService.getChecklists(t); // Called every second!
  updateUI(data, checklists);
};

// ✅ CORRECT - Cache expensive calls
let cachedChecklists = null;
const refresh = async () => {
  const data = await StorageService.getData(t);
  updateUI(data, cachedChecklists);
};
const fullRefresh = async () => {
  cachedChecklists = await ChecklistService.getChecklists(t);
  await refresh();
};
```
