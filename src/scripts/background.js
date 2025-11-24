/**
 * Background Service Worker
 * Handles batch exports, single exports, and offscreen coordination
 */

// Add a constant for chunk size (from Claude's recommendation)
const CHUNK_SIZE = 1024 * 1024; // 1MB

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
    const total = conversationIds.length;
    let successful = 0;
    let failed = 0;

    // UX: Notify start
    chrome.notifications.create('batch-start', {
      type: 'basic',
      iconUrl: 'src/icons/icon128.png', 
      title: 'Batch Export Started',
      message: `Exporting ${total} conversations...`
    });

    // UX: Set Badge
    chrome.action.setBadgeBackgroundColor({ color: '#10a37f' }); // OpenAI Green

    // Ensure offscreen is ready once
    await this.setupOffscreenDocument();

    for (let i = 0; i < total; i++) {
      const id = conversationIds[i];
      const remaining = total - i;
      
      // UX: Update Badge
      chrome.action.setBadgeText({ text: `${remaining}` });

      try {
        const url = `https://chat.openai.com/c/${id}`;
        
        // 1. Fetch HTML (using background fetch)
        const response = await fetch(url, {
            credentials: 'include' 
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();

        const htmlSize = new Blob([html]).size;
        let conversationData;

        // Use chunking for large HTML payloads
        if (htmlSize > 5 * CHUNK_SIZE) { 
          console.log(`HTML size (${(htmlSize / (1024*1024)).toFixed(2)}MB) exceeds threshold, sending in chunks.`);
          const parseResponse = await this.sendChunkedHtmlToOffscreen(html, url);
          if (!parseResponse || !parseResponse.success) {
            throw new Error(parseResponse ? parseResponse.error : 'Parsing failed after chunked transfer');
          }
          conversationData = parseResponse.data;
        } else {
          // Send directly for smaller payloads
          const parseResponse = await chrome.runtime.sendMessage({
              type: 'PARSE_CONVERSATION',
              html,
              url
          });
          if (!parseResponse || !parseResponse.success) {
            throw new Error(parseResponse ? parseResponse.error : 'Parsing failed after direct transfer');
          }
          conversationData = parseResponse.data;
        }
        
        // Check confidence (from ChatGPTExtractor metadata)
        if (conversationData.metadata && conversationData.metadata.confidence < 0.7) {
          console.warn(`Low confidence (${conversationData.metadata.confidence}) for ${id}. Warnings:`, conversationData.metadata.warnings);
          // Fallback to tab extraction
          console.log(`Falling back to tab-based extraction for ${id}`);
          conversationData = await this.fallbackTabExtraction(id);
        }

        // 3. Export and Download
        await this.exportAndDownload(conversationData, format, options);

        // Small delay to be rate-limit friendly
        await this.sleep(1000);
        successful++;

      } catch (error) {
        console.error(`Error processing batch item ${id}:`, error);
        failed++;
      }
    }

    // UX: Clear Badge
    chrome.action.setBadgeText({ text: '' });

    // UX: Notify completion
    chrome.notifications.create('batch-end', {
      type: 'basic',
      iconUrl: 'src/icons/icon128.png',
      title: 'Batch Export Complete',
      message: `Finished! ${successful} succeeded, ${failed} failed.`
    });
  }

  async sendChunkedHtmlToOffscreen(html, url) {
    const chunks = [];
    for (let i = 0; i < html.length; i += CHUNK_SIZE) {
      chunks.push(html.slice(i, i + CHUNK_SIZE));
    }

    // Init transfer
    const initResponse = await chrome.runtime.sendMessage({
      type: 'PARSE_INIT',
      totalChunks: chunks.length,
      url // Pass URL with init message
    });

    if (!initResponse || !initResponse.success) {
      throw new Error('Offscreen chunk parsing initialization failed');
    }

    // Send chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkResponse = await chrome.runtime.sendMessage({
        type: 'PARSE_CHUNK',
        chunk: chunks[i],
        index: i
      });
      if (!chunkResponse || !chunkResponse.success) {
        throw new Error(`Offscreen chunk transfer failed for chunk ${i}`);
      }
    }

    // Complete transfer and trigger parse
    const completeResponse = await chrome.runtime.sendMessage({
      type: 'PARSE_COMPLETE',
      url // Pass URL with complete message
    });

    if (!completeResponse || !completeResponse.success) {
      throw new Error(completeResponse ? completeResponse.error : 'Offscreen chunk parsing completion failed');
    }

    return completeResponse;
  }

  async fallbackTabExtraction(conversationId) {
    console.warn(`Initiating tab-based fallback extraction for ${conversationId}`);
    const url = `https://chat.openai.com/c/${conversationId}`;

    // Open hidden tab
    const tab = await chrome.tabs.create({
      url: url,
      active: false // Keep it in the background
    });

    try {
      await this.waitForPageLoad(tab.id); // Wait for the content script to signal readiness

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_CONVERSATION'
      });

      if (!response || !response.success) {
        throw new Error(response ? response.error : 'Fallback extraction failed');
      }
      return response.data;
    } finally {
      await chrome.tabs.remove(tab.id); // Close the tab after extraction
    }
  }

  // Re-adding waitForPageLoad which was removed in the previous fetch-based refactor
  async waitForPageLoad(tabId, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('Page ready timeout for tab ' + tabId));
      }, timeout);

      const messageListener = (request, sender) => {
        // Ensure the message is from the content script of the specific tab
        if (request.type === 'PAGE_READY' && sender.tab && sender.tab.id === tabId) {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve();
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
    });
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