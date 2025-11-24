# Installation & Testing Guide

## Quick Start

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Navigate to and select this `chatGPTArchiver` directory
5. The extension should now appear in your extensions list

### 2. Pin the Extension (Optional)

1. Click the puzzle piece icon in Chrome toolbar
2. Find "ChatGPTArchiver"
3. Click the pin icon to keep it visible

### 3. Test the Extension

#### Test Single Export

1. Open [ChatGPT](https://chat.openai.com)
2. Navigate to any conversation (or start a new one)
3. Click the ChatGPTArchiver extension icon
4. Select a format (try JSON or Markdown first)
5. Check the export options
6. Click "Export Conversation"
7. Choose where to save the file
8. Verify the exported file contains your conversation

#### Test Batch Export

1. Open ChatGPT with your conversation history visible
2. Click the extension icon
3. Switch to "Batch Export" mode
4. You should see a list of your conversations
5. Select a few conversations
6. Choose a format (JSON/Markdown work best for batch)
7. Click "Export All Selected"
8. Verify multiple files are downloaded

## Troubleshooting

### Extension doesn't appear

**Solution:**
- Refresh `chrome://extensions/`
- Check for errors in the extension card
- Make sure all files are in the correct structure
- Try removing and re-loading the extension

### "Could not extract conversation data"

**Solutions:**
1. Refresh the ChatGPT page
2. Make sure you're on an actual conversation (`/c/...` in URL)
3. Wait for the page to fully load
4. Open DevTools Console (F12) and check for errors

### Export button is disabled

**Solutions:**
- Make sure you've selected a format
- Verify you're on a ChatGPT conversation page
- Check browser console for JavaScript errors

### Batch export shows no conversations

**Solutions:**
- Make sure you're on the ChatGPT main page or a conversation
- The sidebar with conversation history must be visible
- Try expanding the conversation list
- Refresh the page and try again

### PDF/PNG export fails

**Cause:** These formats require external libraries (jsPDF and html2canvas)

**Solutions:**
1. For development, stick to JSON, Markdown, Text, and HTML
2. To enable PDF/PNG, you'll need to add the libraries:
   - Download jsPDF and html2canvas
   - Add them to the extension
   - Update manifest.json to include them

## Development Testing

### Check Content Script

1. Open ChatGPT
2. Open DevTools Console (F12)
3. You should see: `ChatGPTArchiver: Content script loaded`
4. If not, check the content script is injecting properly

### Debug Popup

1. Right-click the extension icon
2. Select "Inspect popup"
3. DevTools will open for the popup
4. Check Console for errors
5. Verify data extraction is working

### Test Data Extraction

In the DevTools console on a ChatGPT page, run:

```javascript
// This should show the extractor is loaded
console.log(typeof extractor);

// Manually trigger extraction
extractor.extractConversation();
```

### Verify Message Passing

1. Open DevTools on ChatGPT page
2. Open popup inspector
3. Try exporting
4. Watch both consoles for messages
5. Verify data flows from content script → popup

## File Structure Verification

Run this to verify all files are present:

```bash
find . -type f -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.css" | sort
```

Expected output:
```
./.gitignore
./manifest.json
./README.md
./INSTALL.md
./create-icons.sh
./src/exporters/html.js
./src/exporters/json.js
./src/exporters/markdown.js
./src/exporters/pdf.js
./src/exporters/png.js
./src/exporters/text.js
./src/icons/icon128.png
./src/icons/icon16.png
./src/icons/icon32.png
./src/icons/icon48.png
./src/popup/popup.css
./src/popup/popup.html
./src/popup/popup.js
./src/scripts/background.js
./src/scripts/content.js
./src/styles/content.css
```

## Known Limitations

1. **ChatGPT UI Changes**: If ChatGPT updates their DOM structure, the content script may need updates
2. **PDF/PNG**: Require additional libraries not included by default
3. **Batch Export**: May be slow for many conversations (navigates to each one)
4. **Attachments**: Currently only exports text, not images or files from conversations

## Next Steps

After testing:

1. Report any bugs or issues
2. Test with different conversation types (code, images, long conversations)
3. Try all export formats
4. Verify exported data quality
5. Test batch export with multiple conversations

## Debugging Tips

### Enable Verbose Logging

Add this to any script for more detailed logs:

```javascript
console.log('DEBUG:', /* your data */);
```

### Check Network Activity

1. Open DevTools Network tab
2. Filter by `chat.openai.com`
3. Watch for API calls
4. Verify data is loading

### Validate Exports

- **JSON**: Use [JSONLint](https://jsonlint.com/) to validate
- **Markdown**: Preview in VS Code or GitHub
- **HTML**: Open in browser to verify rendering

## Support

If issues persist:

1. Check browser console for errors
2. Verify Chrome version is up-to-date
3. Try in Incognito mode (to rule out conflicts)
4. Disable other extensions temporarily
5. Review manifest permissions

Happy exporting! 🚀
