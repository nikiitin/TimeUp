---
description: Run tests and check coverage
---

# Run Tests

## Prerequisites

- Node.js and npm installed (`sudo apt install nodejs npm`)

## First-Time Setup

// turbo

1. Install dependencies:

```bash
npm install
```

## Run Tests

// turbo 2. Run all tests:

```bash
npm test
```

// turbo 3. Run tests with coverage report:

```bash
npm run test:coverage
```

// turbo 4. Run tests in watch mode (during development):

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

## Coverage Report

After running with coverage, view the HTML report:

```bash
open coverage/index.html
```

## Test Structure

```
tests/
├── mocks/
│   └── trelloMock.js     # Trello API mock
├── utils/
│   ├── formatTime.test.js
│   ├── validators.test.js
│   └── constants.test.js
└── services/
    ├── StorageService.test.js
    ├── TimerService.test.js
    ├── ReportService.test.js
    ├── ChecklistService.test.js
    └── TrelloService.test.js
```

---

# Pre-Task Completion Checklist

**IMPORTANT**: Run these checks before completing any task:

// turbo 5. Run tests and verify all pass:

```bash
npm test
```

// turbo 6. Check coverage meets 90% threshold:

```bash
npm run test:coverage
```

If either fails, fix the issues before marking the task complete.
