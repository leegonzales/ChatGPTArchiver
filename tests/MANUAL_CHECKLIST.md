# Manual Test Checklist

Run this checklist before each release to ensure core functionality works correctly in the browser environment.

**Estimated time:** 10 minutes
**Prerequisites:**
- Chrome browser
- ChatGPT account with existing conversations
- Extension loaded in Chrome

---

## 1. Installation & Setup

- [ ] Load unpacked extension in Chrome (`chrome://extensions`)
- [ ] Extension icon appears in toolbar
- [ ] No console errors in background service worker
- [ ] No console errors on extension install

---

## 2. Current Chat Export (Single Conversation)

### 2.1 Basic Exports
- [ ] Navigate to a ChatGPT conversation
- [ ] Click extension icon - popup opens without errors
- [ ] Conversation title displays in status banner
- [ ] Select **JSON** format
- [ ] Click "Archive Conversation" - file downloads
- [ ] Open JSON file - valid JSON structure with messages
- [ ] Select **Markdown** format
- [ ] Click "Archive Conversation" - file downloads
- [ ] Open MD file - contains title, role headers, content
- [ ] Select **Text** format
- [ ] Click "Archive Conversation" - file downloads
- [ ] Open TXT file - readable plain text with role labels
- [ ] Select **HTML** format
- [ ] Click "Archive Conversation" - file downloads
- [ ] Open HTML file in browser - renders correctly
- [ ] Select **PDF** format
- [ ] Click "Archive Conversation" - file downloads
- [ ] Open PDF - renders correctly with readable text
- [ ] Select **PNG** format
- [ ] Click "Archive Conversation" - file downloads
- [ ] Open PNG - image displays full conversation

### 2.2 Export Options
- [ ] Toggle "Include metadata" checkbox off
- [ ] Export JSON - verify no metadata section
- [ ] Toggle "Include timestamps" checkbox off
- [ ] Export Markdown - verify no timestamp tags
- [ ] Toggle "Preserve code blocks" checkbox on
- [ ] Export Markdown - verify code formatting intact

### 2.3 Edge Cases - Current Chat
- [ ] Open very short conversation (1-2 messages) - export works
- [ ] Open very long conversation (50+ messages) - export works
- [ ] Open conversation with code blocks - code preserved
- [ ] Open conversation with special characters in title - filename sanitized
- [ ] Try to export from non-ChatGPT page - shows error message

---

## 3. Batch Export (Multiple Conversations)

### 3.1 Basic Batch Export
- [ ] Click extension icon on ChatGPT page
- [ ] Switch to "Batch Archive" mode
- [ ] Conversation list loads (no "Loading..." stuck state)
- [ ] List shows conversation titles
- [ ] Select 3 conversations using checkboxes
- [ ] Button text updates to "Export 3 Selected"
- [ ] Select format dropdown (choose Markdown)
- [ ] Click "Archive Selected"
- [ ] Badge shows remaining count (3, 2, 1)
- [ ] Success notification appears when complete
- [ ] Verify 3 files downloaded to Downloads folder
- [ ] Open files - all contain correct content

### 3.2 Batch Export Variations
- [ ] Select 1 conversation - exports successfully
- [ ] Select 10+ conversations - all export without errors
- [ ] Try to export with no conversations selected - button disabled
- [ ] Switch format dropdown to JSON - batch export works
- [ ] Switch format dropdown to Text - batch export works

### 3.3 Edge Cases - Batch
- [ ] Start batch export, then close popup - export continues
- [ ] Start batch export, refresh ChatGPT page - export completes
- [ ] Account with 50+ conversations - list renders without lag
- [ ] Deselect all conversations - button shows "Export All Selected" (disabled)

---

## 4. Error Handling & Resilience

- [ ] Disconnect internet mid-export - shows appropriate error
- [ ] Open extension on empty conversation - handles gracefully
- [ ] Try to export immediately after page load (before React hydrates) - works
- [ ] Open extension on ChatGPT error page - shows error message
- [ ] Refresh extension mid-batch export - no crashes
- [ ] Open DevTools console - no unexpected errors or warnings

---

## 5. Content Fidelity

Test with a conversation containing:
- [ ] **Plain text** - exports correctly
- [ ] **Code blocks** (JavaScript, Python) - syntax preserved
- [ ] **Markdown formatting** (bold, italic, lists) - rendered properly
- [ ] **Mathematical formulas** (if applicable) - included
- [ ] **Emojis** - display correctly
- [ ] **Long paragraphs** - no truncation
- [ ] **User + Assistant messages** - roles clearly distinguished

---

## 6. Filename Sanitization

Create conversations with problematic titles and verify safe filenames:
- [ ] Title: `"How to: Build a React App?"` → filename: `how_to_build_a_react_app_YYYY-MM-DD.ext`
- [ ] Title: `../../../etc/passwd` → filename: no path traversal
- [ ] Title with unicode: `你好世界` → filename: sanitized
- [ ] Very long title (100+ chars) → filename: truncated to 50 chars

---

## 7. Performance

- [ ] Export 5 conversations in batch - completes in < 30 seconds
- [ ] Export 100-message conversation - no UI freeze
- [ ] Open extension popup - responds in < 500ms
- [ ] Switch between Current/Batch modes - instant transition
- [ ] Memory usage after 20 exports - no significant leak (check Task Manager)

---

## 8. Cross-Browser Compatibility (Optional)

If targeting beyond Chrome:
- [ ] Edge - extension loads and works
- [ ] Brave - extension loads and works
- [ ] Arc - extension loads and works

---

## 9. Cleanup

- [ ] Remove extension
- [ ] Reinstall from packaged .zip
- [ ] Basic export still works after fresh install

---

## Notes & Issues Found

**Date tested:** ____________

**Tester:** ____________

**Issues found:**
```
1.
2.
3.
```

**Browser version:** Chrome ________

**OS:** ________

---

## Sign-off

- [ ] All critical tests pass (sections 1-5)
- [ ] No major bugs found
- [ ] Ready for release

**Signed:** ____________ **Date:** ____________
