---
skill: test
description: Run tests and check coverage
tags: [testing, jest, coverage]
---

# Test Skill

## Purpose
Run unit tests and verify code coverage meets requirements.

## Prerequisites
- Node.js and npm installed

## Commands

### First-Time Setup
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode (Development)
```bash
npm run test:watch
```

## Coverage Requirements

Tests must meet **90% threshold** for:
- Statements
- Branches
- Functions
- Lines

If coverage drops below 90%, the test suite will fail.

## View Coverage Report

After running with coverage:
```bash
# Linux/Mac
open coverage/index.html

# Windows
start coverage/index.html
```

Or browse to `coverage/index.html` manually.

## Test Structure
```
tests/
├── mocks/
│   └── trelloMock.js     # Trello API mock
├── utils/
│   ├── formatTime.test.js
│   ├── validators.test.js
│   └── constants.test.js
├── services/
│   ├── StorageService.test.js
│   ├── TimerService.test.js
│   ├── ReportService.test.js
│   ├── ChecklistService.test.js
│   └── TrelloService.test.js
└── ui/
    ├── TimerUI.test.js
    ├── EstimateUI.test.js
    └── ...
```

## Pre-Commit Testing Checklist

**CRITICAL**: Run these before completing any task:

1. ✅ Run all tests:
```bash
npm test
```

2. ✅ Check coverage meets 90%:
```bash
npm run test:coverage
```

3. ✅ Verify no console errors

If either fails, fix issues before committing.

## Writing New Tests

### Test File Template
```javascript
import SomeService from '../../src/services/SomeService.js';
import trelloMock from '../mocks/trelloMock.js';

describe('SomeService', () => {
    let t;

    beforeEach(() => {
        t = trelloMock();
    });

    test('should do something correctly', async () => {
        // Arrange
        const input = 'test';
        
        // Act
        const result = await SomeService.doSomething(t, input);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
    });

    test('should handle errors', async () => {
        // Arrange - make API fail
        t.get.mockRejectedValue(new Error('API error'));
        
        // Act
        const result = await SomeService.doSomething(t);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
```

## Common Testing Patterns

### Test Service Return Pattern
```javascript
test('should return success pattern', async () => {
    const result = await SomeService.operation(t);
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data).toBeDefined();
    } else {
        expect(result.error).toBeDefined();
    }
});
```

### Mock Trello Storage
```javascript
beforeEach(() => {
    t = trelloMock();
    // Pre-populate storage
    t.get.mockResolvedValue({
        entries: [],
        state: 'idle',
        currentEntry: null,
        estimatedTime: null
    });
});
```

### Test Error Handling
```javascript
test('should handle API errors gracefully', async () => {
    t.get.mockRejectedValue(new Error('Network error'));
    
    const result = await Service.method(t);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
});
```

## Debugging Failed Tests

### Run Single Test File
```bash
npm test -- StorageService.test.js
```

### Run Single Test
```bash
npm test -- -t "should start timer"
```

### Enable Verbose Output
```bash
npm test -- --verbose
```

## Related Skills
- add-feature.skill.md - Add features with tests
- debug.skill.md - Debug test failures
