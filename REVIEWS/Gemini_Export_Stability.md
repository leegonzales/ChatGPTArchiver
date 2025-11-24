# Gemini Export Stability Review

- **PDF/PNG dependency gap (popup)**  
  - Problem: Popup triggers `PDFExporter`/`PNGExporter` directly but doesn’t load `jspdf`/`html2canvas`. Exporters hard-check `window.jspdf` / `window.html2canvas` and throw (`src/exporters/pdf.js`:19-22, `src/exporters/png.js`:19-22). `src/popup/popup.html` lacks script tags for these libs, so PDF/PNG single exports always fail.  
  - Fix: Either (1) include `../lib/jspdf.min.js` and `../lib/html2canvas.min.js` in `popup.html` (with CSP-safe inline disabled), or (2) route PDF/PNG through the offscreen worker (where libs are already loaded) and keep the popup UI-only. If you route, remove direct instantiation in `popup.js` and delegate all formats to a background/offscreen flow for consistency.

- **Batch export hijacks user tab**  
  - Problem: `handleBatchExport` navigates the active tab to each conversation (`src/scripts/background.js`:55-86). Users lose context; any click interrupts the run.  
  - Fix: Use a dedicated tab or offscreen document to process the queue. Options:  
    1) Create a hidden/offscreen context to generate exports (you already have offscreen for formatting). Fetch or script-run per conversation without stealing the active tab.  
    2) If you must use a real tab, open a new background tab/window and close it when done. Add progress/error reporting to the popup or via notifications.

- **Offscreen readiness race**  
  - Problem: After `chrome.offscreen.createDocument`, `exportAndDownload` immediately sends `GENERATE_EXPORT` (`src/scripts/background.js`:151-173). The offscreen listener may not yet be registered, yielding “No response” with no retry.  
  - Fix: After creation, poll `chrome.runtime.sendMessage({type: 'PING_OFFSCREEN'})` (handled in offscreen) until acknowledged or timeout; then send `GENERATE_EXPORT`. Alternatively, wrap `sendMessage` in a retry loop (small backoff, limited attempts).

- **Message routing clarity**  
  - `handleMessage` default case does nothing (`src/scripts/background.js`:43-51), which can hide unexpected message types. Log unknown types to aid debugging, or explicitly return an error for unhandled types unless another listener is expected to respond.

- **Exporter duplication / context split**  
  - Export logic now lives in both popup (direct instantiation) and offscreen (imports exporters). This increases drift. Prefer a single execution path (e.g., background/offscreen owns all export work; popup only collects inputs and shows status). This also solves the PDF/PNG dependency issue and keeps blob handling centralized.

- **Download flow robustness**  
  - Offscreen returns a Data URL for downloads (`src/offscreen/offscreen.js`:51-79). Fine for modest files, but large chats may produce huge Data URLs. Consider returning a blob URL via `URL.createObjectURL` inside offscreen and revoking after `chrome.downloads.download`, or stream chunks if you add very large exports. Also add error responses for `reader.onerror` on the string branch (currently missing).  

- **Batch timing / readiness**  
  - `waitForPageLoad` checks `tab.status === 'complete'` then waits 2s (`src/scripts/background.js`:95-120). ChatGPT is an SPA; the status may be “complete” before messages render. Add a content-script “ready” ping (e.g., wait for `[data-testid^="conversation-turn-"]`) before extraction, or extend retry logic on `EXTRACT_CONVERSATION`.

- **Shared utilities**  
  - Filename sanitizer duplicated across exporters (`src/exporters/*`). Extract to a shared helper to keep consistency and simplify updates.

- **Manifest alignment**  
  - Offscreen page (`src/offscreen/offscreen.html`) loads libs and module script. Ensure `offscreen` permission stays in `manifest.json` and CSP allows these local scripts. If you keep exporters out of `web_accessible_resources` (now absent), good—reduces surface.

## Concrete Remediation Plan
1) Decide on a single export execution context: route all formats through offscreen. Update `popup.js` to send `START_EXPORT` to background; background ensures offscreen ready (handshake), forwards to offscreen, receives Data/Blob URL, triggers download, and updates status via `chrome.runtime.sendMessage` or `chrome.notifications`.  
2) Implement offscreen readiness handshake and retry before sending `GENERATE_EXPORT`.  
3) Change batch export to avoid active tab navigation: use dedicated tab or offscreen processing; add progress/complete/error notifications.  
4) Add content-ready check before extraction (message or DOM probe) to reduce batch failures on SPA load races.  
5) Add shared `sanitizeFilename` helper and reuse across exporters.  
6) Optionally load `jspdf`/`html2canvas` in popup only if you keep local execution; otherwise remove direct PDF/PNG code paths from popup.
