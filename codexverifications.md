# Codex Verifications (Post-Implementation Check)

## Issues Found
- **Extractor crash on avatars**  
  `ChatGPTExtractor.getMessageRole` now does `const alt = avatar.toLowerCase()` on the element, not its `alt` string (`src/utils/extractor.js`:204-208). Any message node with an avatar will throw `avatar.toLowerCase is not a function`, aborting extraction (live and static/offscreen).

- **Fallback tab extraction never signals ready**  
  `waitForPageLoad` listens for `PAGE_READY` before sending `EXTRACT_CONVERSATION` (`src/scripts/background.js`:188-206), but the content script only emits `PAGE_READY` inside its `EXTRACT_CONVERSATION` handler (`src/scripts/content-main.js`:81-101). In the fallback path this means a guaranteed timeout and batch item failure whenever you hit low-confidence HTML.

- **Large-HTML transfer still hops huge strings**  
  Background fetch splits HTML into 1 MB string chunks and sends them over `chrome.runtime.sendMessage` (`src/scripts/background.js`:6-160), reassembled into a giant string buffer in offscreen (`src/offscreen/offscreen.js`:5-54). This copies tens of MB in JS heaps and the threshold mixes UTF-16 string slicing with a Blob-sized check, so 10 MB+ pages can still blow past message memory and stall the worker. MV3-safe alternative: fetch/parse in offscreen to avoid the hop, or pass an object URL/Blob to offscreen instead of raw strings.

- **Data URL bloat for downloads**  
  Offscreen always converts exports (including PDF/PNG blobs) to Data URLs and sends them back; background downloads from that string (`src/offscreen/offscreen.js`:113-148, `src/scripts/background.js`:264-280). Large chats balloon ~33% and get copied multiple times. Use `URL.createObjectURL` in offscreen and revoke after download to avoid memory spikes.

- **Chunked parse state is global and non-reentrant**  
  Offscreen reassembly buffers (`htmlBuffer`, counters, `currentParseUrl`) are shared globals without guarding (`src/offscreen/offscreen.js`:5-54). Concurrent parses (e.g., user triggers single export while batch is running) can corrupt state and return mixed HTML.

## Open Questions / Edge Cases
- Should we add a top-level `PAGE_READY` signal on content load (or a DOM readiness check in `waitForPageLoad`) so fallback extraction can ever succeed?  
- Is background fetch acceptable in all auth/cookie setups, or do we still need a “fetch-in-offscreen” or “live tab fallback on 302/403” branch for strict cookie policies?
