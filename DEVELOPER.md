# Developer Guide

## Quick Start for Developers

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Navigate to and select the root `ChatGPTArchiver` directory
5. The extension should now appear in your extensions list

### 2. Architecture Overview

This extension uses a **Manifest V3** architecture with the following components:

*   **Content Scripts:**
    *   `content-loader.js`: Dynamic loader for ES module support.
    *   `content-main.js`: Injects the "Export" button and handles UI interactions on `chat.openai.com`.
*   **Background Service Worker:**
    *   `background.js`: Orchestrates batch exports, handles message passing, and manages the offscreen document.
*   **Offscreen Document:**
    *   `offscreen.html` / `offscreen.js`: A hidden document used to parse HTML (using `DOMParser` which isn't available in Service Workers) and generate PDF/PNGs (using `jsPDF` and `html2canvas`).
*   **Popup:**
    *   `popup.html` / `popup.js`: The user interface for selecting formats and options.
*   **Utils:**
    *   `extractor.js`: Shared logic for parsing ChatGPT DOM/HTML into a structured JSON format.
    *   `common.js`: Shared utilities like filename sanitization.

### 3. Debugging

#### Debugging the Popup
1. Right-click the extension icon.
2. Select "Inspect popup".
3. This opens DevTools for the popup context.

#### Debugging the Background Worker
1. Go to `chrome://extensions`.
2. Find "ChatGPTArchiver".
3. Click "service worker".
4. This opens DevTools for `background.js`. Use this to debug batch exports and fetch logic.

#### Debugging Content Scripts
1. Open `chat.openai.com`.
2. Open standard DevTools (F12).
3. Console logs from `content-main.js` will appear here.

## Key Features Implementation

### Batch Export via Background Fetch
Unlike older extensions that hijack the active tab, this extension uses **Background Fetch**:
1.  `background.js` iterates through conversation IDs.
2.  It uses `fetch()` to retrieve the raw HTML of the conversation (using the user's cookies).
3.  It sends this HTML to the **Offscreen Document**.
4.  `offscreen.js` parses the HTML string using `DOMParser` and `ChatGPTExtractor`.
5.  The extracted data is sent back (or handled directly) to generate the file.
6.  `background.js` triggers the download.

**Note on Large Files:** Large HTML payloads (>5MB) are chunked before being sent to the offscreen document to avoid Chrome's message size limits.

### PDF & PNG Generation
PDF and PNG generation requires DOM access, so it happens inside the **Offscreen Document**, which has a full DOM environment. We use `jsPDF` and `html2canvas` libraries included in `src/lib/`.

## File Structure

```
/
├── manifest.json           # Extension configuration
├── README.md              # User documentation
├── DEVELOPER.md           # This file
├── src/
│   ├── exporters/         # Logic for JSON, MD, HTML, PDF, PNG, TXT
│   ├── icons/             # Extension icons
│   ├── lib/               # Dependencies (jsPDF, html2canvas)
│   ├── offscreen/         # Offscreen document for parsing/rendering
│   ├── popup/             # Extension UI
│   ├── scripts/           # Background and Content scripts
│   ├── styles/            # CSS
│   └── utils/             # Shared extractors and helpers
└── dist/                  # Packaged releases
```

## Known Limitations

1.  **ChatGPT UI Changes**: If ChatGPT updates their DOM structure (class names, test IDs), `src/utils/extractor.js` may need updates to find messages.
2.  **Incomplete Fetches**: Background fetch gets the *server-rendered* HTML. Dynamic content (lazy-loaded messages) might be missing. The extension has a fallback mechanism ("Confidence Scoring") to detect this and switch to tab-based extraction if needed.

## Contributing

Please ensure any changes to `extractor.js` are tested against both live DOM (content script) and static HTML (offscreen parser) scenarios.