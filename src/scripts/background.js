/**
 * Background Service Worker
 * Handles batch exports, single exports, and offscreen coordination
 */

class BackgroundService {
  constructor() {
    this.offscreenPromise = null; // Promise-based singleton for race condition handling
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Use an async IIFE to handle the promise-based logic
      (async () => {
        try {
          await this.handleMessage(request, sender, sendResponse);
        } catch (error) {
          console.error('Background handler error:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // Keep channel open for async responses
    });

    chrome.runtime.onInstalled.addListener(() => {
      console.log('ChatGPT Archiver installed');
    });
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'EXPORT_SINGLE':
        const { data, format, options } = request.payload;
        await this.exportAndDownload(data, format, options);
        sendResponse({ success: true });
        break;

      case 'BATCH_EXPORT':
        await this.handleBatchExport(request);
        sendResponse({ success: true });
        break;

      case 'OPEN_EXPORT_PANEL':
        await this.openExportPanel(request.data);
        sendResponse({ success: true });
        break;
      
      default:
        break; 
    }
  }

  async handleBatchExport(request) {
    const { conversationIds, format, options } = request;

    // Ensure offscreen is ready once
    await this.setupOffscreenDocument();

    for (const id of conversationIds) {
      try {
        const url = `https://chat.openai.com/c/${id}`;
        
        // 1. Fetch HTML (using background fetch)
        // Uses 'include' credentials to leverage the user's auth cookie.
        // Host permissions for chat.openai.com allow this request to bypass CORS in MV3 extensions.
        const response = await fetch(url, {
            credentials: 'include' 
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();

        // 2. Parse in Offscreen (Background cannot use DOMParser)
        const parseResponse = await chrome.runtime.sendMessage({
            type: 'PARSE_CONVERSATION',
            html,
            url
        });
        
        if (!parseResponse || !parseResponse.success) {
            throw new Error(parseResponse ? parseResponse.error : 'Parsing failed');
        }

        // 3. Export and Download
        await this.exportAndDownload(parseResponse.data, format, options);

        // Small delay to be rate-limit friendly
        await this.sleep(1000);

      } catch (error) {
        console.error(`Error processing batch item ${id}:`, error);
        // Continue to next item rather than aborting entire batch
      }
    }
  }

  async openExportPanel(conversationData) {
    await chrome.storage.local.set({
      currentConversation: conversationData
    });
  }

  async setupOffscreenDocument() {
    // Singleton pattern with promise to prevent race conditions (Fix for Gemini Review #6)
    if (this.offscreenPromise) {
      return this.offscreenPromise;
    }

    this.offscreenPromise = (async () => {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });

      if (existingContexts.length > 0) {
        return;
      }

      try {
        await chrome.offscreen.createDocument({
          url: 'src/offscreen/offscreen.html',
          reasons: ['BLOBS'],
          justification: 'To render exports'
        });
        
        // Handshake to ensure offscreen is listening
        await this.waitForOffscreen();
      } catch (error) {
        this.offscreenPromise = null; // Reset on failure so retry is possible
        throw error;
      }
    })();

    return this.offscreenPromise;
  }

  async waitForOffscreen(attempts = 10) {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'PING' });
        if (response && response.success) {
          return true;
        }
      } catch (e) {
        // Ignore error, keep retrying
      }
      await this.sleep(100);
    }
    throw new Error('Offscreen document failed to load');
  }

  async exportAndDownload(data, format, options) {
    try {
      await this.setupOffscreenDocument();

      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_EXPORT',
        data,
        format,
        options
      });

      if (response && response.success) {
        await chrome.downloads.download({
          url: response.data.content,
          filename: response.data.filename
        });
      } else {
        throw new Error(response ? response.error : 'Export generation failed');
      }
    } catch (error) {
      console.error('Export/Download error:', error);
      throw error; 
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize background service
new BackgroundService();
