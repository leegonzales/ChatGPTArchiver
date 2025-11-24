/**
 * Content script main logic (ES Module)
 * Handles UI injection and communication
 */

import { ChatGPTExtractor } from '../utils/extractor.js';

class ContentController {
  constructor() {
    this.extractor = new ChatGPTExtractor(document);
    this.buttonObserver = null;
    this.init();
  }

  init() {
    console.log('ChatGPT Archiver: Content script loaded');
    this.injectExportButton();
    this.setupMessageListener();
  }

  injectExportButton() {
    this.cleanupObserver();

    this.buttonObserver = new MutationObserver(() => {
      const targetContainer = document.querySelector('nav, header, [class*="sticky"]');
      if (targetContainer && !document.getElementById('chatgpt-archive-btn')) {
        this.createExportButton(targetContainer);
        this.cleanupObserver();
      }
    });

    this.buttonObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      if (this.buttonObserver) {
        console.warn('ChatGPT Archiver: Export button target not found within 10 seconds. Disconnecting observer.');
        this.cleanupObserver();
      }
    }, 10000);
  }

  cleanupObserver() {
    if (this.buttonObserver) {
      this.buttonObserver.disconnect();
      this.buttonObserver = null;
    }
  }

  createExportButton(container) {
    const button = document.createElement('button');
    button.id = 'chatgpt-archive-btn';
    button.className = 'chatgpt-archive-button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Export
    `;
    button.title = 'Export this conversation';

    button.addEventListener('click', () => {
      this.handleExportClick();
    });

    container.appendChild(button);
  }

  handleExportClick() {
    const data = this.extractor.extractConversation();
    chrome.runtime.sendMessage({
      type: 'OPEN_EXPORT_PANEL',
      data: data
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'EXTRACT_CONVERSATION') {
        const data = this.extractor.extractConversation();
        // Signal ready state after extraction (legacy support for background polling)
        this.sendPageReadySignal();
        sendResponse({ success: true, data });
      }

      if (request.type === 'GET_ALL_CONVERSATIONS') {
        const conversations = this.getAllConversationLinks();
        sendResponse({ success: true, data: conversations });
      }

      return true;
    });
  }

  sendPageReadySignal() {
    chrome.runtime.sendMessage({ type: 'PAGE_READY' });
  }

  getAllConversationLinks() {
    const links = [];
    const conversationLinks = document.querySelectorAll('a[href*="/c/"]');

    conversationLinks.forEach(link => {
      const href = link.href;
      const title = link.textContent.trim();
      const id = href.match(/\/c\/([a-zA-Z0-9-]+)/)?.[1];

      if (id && !links.find(l => l.id === id)) {
        links.push({ id, title, url: href });
      }
    });

    return links;
  }
}

const controller = new ContentController();

window.addEventListener('beforeunload', () => {
  controller.cleanupObserver();
});
