# ChatGPTArchiver Tests

This directory contains automated and manual tests for ChatGPTArchiver.

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Watch mode (tests re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

```
tests/
├── README.md                 # This file
├── MANUAL_CHECKLIST.md      # Manual testing checklist for releases
├── common.test.js           # Tests for src/utils/common.js
├── extractor.test.js        # Tests for src/utils/extractor.js
└── exporters.test.js        # Tests for src/exporters/*.js
```

## What's Tested

### Unit Tests (Automated)

✅ **common.js** (10 tests)
- Filename sanitization
- Special character handling
- Path traversal prevention
- Length truncation
- Unicode handling

✅ **extractor.js** (20+ tests)
- DOM extraction logic
- Conversation ID parsing
- Title extraction
- Message role detection
- Timestamp parsing
- Confidence scoring
- Completeness assessment

✅ **exporters** (30+ tests)
- JSON export (pretty/compact, metadata, HTML)
- Text export (formatting, separators, timestamps)
- Markdown export (headers, code blocks, metadata)

**Total:** 60+ automated tests

### Manual Tests

See `MANUAL_CHECKLIST.md` for comprehensive manual testing before releases.

## Testing Philosophy

Following the "pytest" philosophy from global CLAUDE.md:
- Fast, minimal test runner (Vitest)
- Simple commands (`npm test`)
- High-value tests for core functionality
- Unit tests for pure JavaScript
- Manual checklist for browser-specific features

## What's NOT Tested (Manual Only)

Chrome extension features that require a real browser:
- Background service worker behavior
- Content script injection
- Popup UI interactions
- Chrome API calls (downloads, notifications, storage)
- PDF/PNG generation (uses browser-only libraries)

These are covered in the manual test checklist.

## Coverage Goals

| Component | Target Coverage | Current |
|-----------|----------------|---------|
| `utils/common.js` | 80%+ | Run `npm run test:coverage` |
| `utils/extractor.js` | 70%+ | Run `npm run test:coverage` |
| `exporters/*.js` | 50%+ | Run `npm run test:coverage` |

## Adding New Tests

When adding new features:

1. **Add unit tests** for pure JavaScript functions
2. **Update manual checklist** for browser-specific features
3. **Run tests** before committing: `npm test`
4. **Check coverage** if needed: `npm run test:coverage`

## CI Integration

To add GitHub Actions CI:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## Troubleshooting

**Tests fail with "Cannot find module":**
```bash
npm install
```

**JSDOM errors:**
- Vitest uses JSDOM to simulate browser environment
- Some browser-only features may need mocking
- Check `vitest.config.js` environment settings

**Import errors:**
- Ensure `package.json` has `"type": "module"`
- Use `.js` extensions in import statements

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [JSDOM Documentation](https://github.com/jsdom/jsdom)
- Manual test checklist: `MANUAL_CHECKLIST.md`
