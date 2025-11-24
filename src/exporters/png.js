/**
 * PNG Exporter
 * Exports conversation as PNG image using html2canvas
 * Note: This requires html2canvas to be loaded
 */

import { sanitizeFilename } from '../utils/common.js';

export class PNGExporter {
  constructor(conversationData) {
    this.data = conversationData;
  }

  async export(options = {}) {
    const {
      scale = 2, // Higher scale = better quality
      backgroundColor = '#ffffff',
      theme = 'light'
    } = options;

    // Check if html2canvas is available
    if (typeof window.html2canvas === 'undefined') {
      throw new Error('html2canvas library not loaded. PNG export requires html2canvas.');
    }

    // Create temporary container with conversation HTML
    const container = this.createTempContainer(theme);
    document.body.appendChild(container);

    try {
      const canvas = await window.html2canvas(container, {
        scale,
        backgroundColor,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const blob = await this.canvasToBlob(canvas);

      return {
        content: blob,
        filename: this.generateFilename(),
        mimeType: 'image/png',
        isBlob: true
      };
    } finally {
      document.body.removeChild(container);
    }
  }

  createTempContainer(theme) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      color: ${theme === 'dark' ? '#ffffff' : '#000000'};
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = this.data.title;
    title.style.cssText = `
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 20px;
      color: ${theme === 'dark' ? '#ffffff' : '#000000'};
    `;
    container.appendChild(title);

    // Metadata
    const metadata = document.createElement('div');
    metadata.style.cssText = `
      font-size: 12px;
      color: ${theme === 'dark' ? '#b3b3b3' : '#666666'};
      margin-bottom: 30px;
    `;
    metadata.textContent = `Exported: ${new Date().toLocaleString()} | Messages: ${this.data.messages.length}`;
    container.appendChild(metadata);

    // Messages
    this.data.messages.forEach(msg => {
      const messageEl = this.createMessageElement(msg, theme);
      container.appendChild(messageEl);
    });

    return container;
  }

  createMessageElement(msg, theme) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      margin-bottom: 20px;
      padding: 16px;
      border-radius: 8px;
      background: ${msg.role === 'user'
        ? (theme === 'dark' ? '#2d2d2d' : '#f7f7f8')
        : (theme === 'dark' ? '#1a1a1a' : '#ffffff')};
      border: 1px solid ${theme === 'dark' ? '#404040' : '#e5e5e5'};
    `;

    // Role header
    const header = document.createElement('div');
    header.style.cssText = `
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 8px;
      color: ${theme === 'dark' ? '#ffffff' : '#000000'};
    `;
    header.textContent = msg.role === 'user' ? 'You' : 'ChatGPT';
    messageDiv.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.style.cssText = `
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: ${theme === 'dark' ? '#ffffff' : '#000000'};
    `;
    content.textContent = msg.content.text;
    messageDiv.appendChild(content);

    return messageDiv;
  }

  canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }

  generateFilename() {
    const title = sanitizeFilename(this.data.title);
    const date = new Date().toISOString().split('T')[0];
    return `${title}_${date}.png`;
  }
}
