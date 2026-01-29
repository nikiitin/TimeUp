---
description: Standard workflow for adding new features to TimeUp
---

# Add a New Feature

Follow this workflow to add features while maintaining architecture consistency.

## 1. Plan the Feature

Before coding, identify:

- [ ] Which Power-Up capability is affected? (`card-buttons`, `card-badges`, etc.)
- [ ] Does it need new data stored? (Update `TimerData` model)
- [ ] Does it need new UI? (Which view file?)
- [ ] Does it need new business logic? (Which service?)

## 2. Update Constants (if needed)

If adding new storage keys, states, or defaults:

**File**: `src/utils/constants.js`

```javascript
// Add new storage key
export const STORAGE_KEYS = {
  // ... existing
  NEW_KEY: "newKey",
};

// Add new default
export const DEFAULTS = {
  // ... existing
  NEW_DATA: {
    /* default structure */
  },
};
```

## 3. Create/Update Service

All business logic goes in `src/services/`.

**Pattern to follow**:

```javascript
/**
 * Does something important.
 * @param {Object} t - Trello client
 * @param {string} someParam - Description
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const doSomething = async (t, someParam) => {
  try {
    // Validate input
    // Get current data
    // Perform operation
    // Save updated data
    return { success: true, data: updatedData };
  } catch (error) {
    console.error("[ServiceName] doSomething error:", error);
    return { success: false, error: error.message };
  }
};
```

**Remember**:

- Always wrap in try/catch
- Always return `{ success, data?, error? }` pattern
- Log errors with `[ServiceName]` prefix

## 4. Update UI

UI files only handle DOM manipulation. They import and call services.

**Pattern**:

```javascript
import SomeService from "../services/SomeService.js";

// Get DOM elements
const myButton = document.getElementById("my-button");

// Event handler calls service
myButton.addEventListener("click", async () => {
  const result = await SomeService.doSomething(t, value);
  if (result.success) {
    // Update display with result.data
  } else {
    // Show error to user
  }
});
```

## 5. Add CSS (if needed)

**For new components**: Add to `styles/components.css` using BEM:

```css
.feature-name {
}
.feature-name__element {
}
.feature-name__element--modifier {
}
```

**For new colors**: First add to `styles/variables.css`:

```css
:root {
  --color-feature: #hexvalue;
}
```

## 6. Update Main Connector (if new capability)

If adding a new Power-Up capability, register it in `src/main.js`:

```javascript
TrelloPowerUp.initialize({
  // ... existing capabilities
  "new-capability": async (t) => {
    // Return capability configuration
  },
});
```

## 7. Test

Follow `/test-in-trello` workflow to verify:

- [ ] Feature works with timer running
- [ ] Feature works with timer stopped
- [ ] Feature works with zero entries
- [ ] Feature works with multiple entries
- [ ] No console errors
- [ ] UI updates correctly after actions

## 8. Pre-Commit Review

Before committing, verify all items in `.agent/rules.md`:

- [ ] Security: XSS prevention (escape all external data in HTML)
- [ ] Error handling: No silent failures (all errors notified to user)
- [ ] Performance: No redundant API calls in refresh loops

## 9. Document

Update `README.md` if the feature is user-facing.
