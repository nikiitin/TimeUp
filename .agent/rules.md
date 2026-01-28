# TimeUp - Agent Rules

## Pre-Commit Review Checklist

Before committing any code changes, VERIFY all of the following:

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
  - Use in-place updates to avoid losing input focus
- [ ] **Check for memory leaks**
  - Event listeners must be removed when elements are destroyed
  - Intervals must be cleared when leaving the view

### 4. Code Quality & Dead Code
- [ ] **No trailing whitespace**
- [ ] **Consistent error message format**
- [ ] **JSDoc for all public functions**
- [ ] **No unused CSS classes** - search for class names in HTML/JS before removing
- [ ] **No dead JavaScript functions** - ensure all defined functions are called
- [ ] **No duplicate code** - extract common patterns into reusable functions

### 5. Code Duplication Check
- [ ] **Entry creation logic**: Should only exist in `createEntry()` helper
- [ ] **Timer stop logic**: Should be consolidated, avoid duplicating entry creation
- [ ] **Formatting functions**: Use existing `formatDuration`, `formatTimestamp`, `escapeHtml`
- [ ] **CSS**: Check if similar styles already exist before adding new ones

### 6. Functionality Verification
- [ ] **All new features are tested** - add unit tests for new service functions
- [ ] **Existing tests still pass** - run `npm test` before committing
- [ ] **Test coverage above 90%** - run `npm run test:coverage`
- [ ] **Manual testing in Trello** - verify UI works with `/test-in-trello` workflow

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

### DOM Update Optimization
```javascript
// ❌ WRONG - Full DOM rebuild loses focus
const update = () => {
  container.innerHTML = buildHTML(); // Destroys input focus!
};

// ✅ CORRECT - In-place updates preserve focus
const update = () => {
  // Only update specific elements, not entire container
  timeEl.textContent = newValue;
  if (document.activeElement !== inputEl) {
    inputEl.placeholder = newPlaceholder;
  }
};
```

### Avoiding Code Duplication
```javascript
// ❌ WRONG - Duplicate entry creation logic
const stopTimer = () => {
  const entry = { id: uuid(), startTime, endTime: Date.now(), duration: ... };
  // ...
};
const stopItemTimer = () => {
  const entry = { id: uuid(), startTime, endTime: Date.now(), duration: ... };
  // ...
};

// ✅ CORRECT - Extract common logic
const createEntry = (startTime, endTime, description) => ({
  id: uuid(), startTime, endTime, description, duration: endTime - startTime
});
const stopTimer = () => {
  const entry = createEntry(startTime, Date.now(), desc);
  // ...
};
```
