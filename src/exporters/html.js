/**
 * HTML Exporter
 * Exports conversation as standalone HTML file with styling
 */

import { sanitizeFilename } from '../utils/common.js';

export class HTMLExporter {
  constructor(conversationData) {
    this.data = conversationData;
  }

  export(options = {}) {
    const {
      theme = 'auto', // 'light', 'dark', 'auto'
      includeStyles = true,
      standalone = true
    } = options;

    const html = this.buildHTML(theme, includeStyles, standalone);

    return {
      content: html,
      filename: this.generateFilename(),
      mimeType: 'text/html'
    };
  }

  buildHTML(theme, includeStyles, standalone) {
    const messages = this.renderMessages();
    const styles = includeStyles ? this.getStyles(theme) : '';

    if (standalone) {
      return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(this.data.title)}</title>
  ${styles}
</head>
<body>
  <div class="container">
    <header>
      <h1>${this.escapeHTML(this.data.title)}</h1>
      <div class="metadata">
        <span>Exported: ${new Date().toLocaleString()}</span>
        <span>Messages: ${this.data.messages.length}</span>
      </div>
    </header>
    <main class="conversation">
      ${messages}
    </main>
    <footer>
      <p>Exported with ChatGPTArchiver</p>
    </footer>
  </div>
</body>
</html>`;
    }

    return messages;
  }

  renderMessages() {
    return this.data.messages.map(msg => this.renderMessage(msg)).join('\n');
  }

  renderMessage(msg) {
    const roleClass = msg.role === 'user' ? 'user' : 'assistant';
    const roleLabel = msg.role === 'user' ? 'You' : 'ChatGPT';
    const timestamp = msg.timestamp ? `<time>${this.formatTimestamp(msg.timestamp)}</time>` : '';

    return `
<div class="message ${roleClass}">
  <div class="message-header">
    <span class="role">${roleLabel}</span>
    ${timestamp}
  </div>
  <div class="message-content">
    ${this.escapeHTML(msg.content.html || msg.content.text)}
  </div>
</div>`;
  }

  getStyles(theme) {
    return `<style>
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f7f7f8;
    --text-primary: #000000;
    --text-secondary: #666666;
    --border-color: #e5e5e5;
    --user-bg: #f7f7f8;
    --assistant-bg: #ffffff;
    --code-bg: #f4f4f4;
    --shadow: rgba(0, 0, 0, 0.1);
  }

  [data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --text-secondary: #b3b3b3;
    --border-color: #404040;
    --user-bg: #2d2d2d;
    --assistant-bg: #1a1a1a;
    --code-bg: #2d2d2d;
    --shadow: rgba(0, 0, 0, 0.3);
  }

  @media (prefers-color-scheme: dark) {
    [data-theme="auto"] {
      --bg-primary: #1a1a1a;
      --bg-secondary: #2d2d2d;
      --text-primary: #ffffff;
      --text-secondary: #b3b3b3;
      --border-color: #404040;
      --user-bg: #2d2d2d;
      --assistant-bg: #1a1a1a;
      --code-bg: #2d2d2d;
      --shadow: rgba(0, 0, 0, 0.3);
    }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--bg-primary);
    padding: 20px;
  }

  .container {
    max-width: 900px;
    margin: 0 auto;
  }

  header {
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 2px solid var(--border-color);
  }

  h1 {
    font-size: 32px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .metadata {
    display: flex;
    gap: 20px;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .conversation {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .message {
    padding: 20px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .message.user {
    background: var(--user-bg);
  }

  .message.assistant {
    background: var(--assistant-bg);
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .role {
    font-weight: 600;
    font-size: 14px;
  }

  time {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .message-content {
    font-size: 15px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .message-content pre {
    background: var(--code-bg);
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
  }

  .message-content code {
    font-family: "Consolas", "Monaco", "Courier New", monospace;
    font-size: 14px;
  }

  .message-content p {
    margin: 12px 0;
  }

  footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
    text-align: center;
    color: var(--text-secondary);
    font-size: 14px;
  }

  @media print {
    body {
      padding: 0;
    }
    .message {
      break-inside: avoid;
    }
  }
</style>`;
  }

  formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  generateFilename() {
    const title = sanitizeFilename(this.data.title);
    const date = new Date().toISOString().split('T')[0];
    return `${title}_${date}.html`;
  }
}
