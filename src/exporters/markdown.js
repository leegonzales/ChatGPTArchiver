/**
 * Markdown Exporter
 * Exports conversation as readable Markdown with preserved formatting
 */

import { sanitizeFilename } from '../utils/common.js';

export class MarkdownExporter {
  constructor(conversationData) {
    this.data = conversationData;
  }

  export(options = {}) {
    const {
      includeMetadata = true,
      includeTimestamps = true,
      codeBlockStyle = 'fenced' // 'fenced' or 'indented'
    } = options;

    const markdown = this.buildMarkdown(includeMetadata, includeTimestamps, codeBlockStyle);

    return {
      content: markdown,
      filename: this.generateFilename(),
      mimeType: 'text/markdown'
    };
  }

  buildMarkdown(includeMetadata, includeTimestamps, codeBlockStyle) {
    let md = '';

    // Header
    md += `# ${this.data.title}\n\n`;

    // Metadata
    if (includeMetadata) {
      md += '---\n\n';
      md += `**Conversation ID:** ${this.data.conversationId}\n\n`;
      md += `**Exported:** ${new Date().toLocaleString()}\n\n`;
      md += `**Messages:** ${this.data.messages.length}\n\n`;
      if (this.data.url) {
        md += `**URL:** ${this.data.url}\n\n`;
      }
      md += '---\n\n';
    }

    // Messages
    this.data.messages.forEach((msg, idx) => {
      md += this.formatMessage(msg, idx, includeTimestamps, codeBlockStyle);
    });

    return md;
  }

  formatMessage(msg, idx, includeTimestamps, codeBlockStyle) {
    let md = '';

    // Role header
    const roleEmoji = msg.role === 'user' ? '👤' : '🤖';
    const roleTitle = msg.role === 'user' ? 'User' : 'Assistant';
    md += `## ${roleEmoji} ${roleTitle}`;

    // Timestamp
    if (includeTimestamps && msg.timestamp) {
      md += ` <sup>${this.formatTimestamp(msg.timestamp)}</sup>`;
    }

    md += '\n\n';

    // Content
    md += this.formatContent(msg.content, codeBlockStyle);
    md += '\n\n';

    // Separator
    if (idx < this.data.messages.length - 1) {
      md += '---\n\n';
    }

    return md;
  }

  formatContent(content, codeBlockStyle) {
    let text = content.text;

    // Convert HTML code blocks to markdown if present
    if (content.hasCode && content.html) {
      text = this.convertCodeBlocks(content.html, codeBlockStyle);
    }

    return text;
  }

  convertCodeBlocks(html, style) {
    // Parse HTML and extract code blocks
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const codeBlocks = doc.querySelectorAll('pre code, code');

    let result = html;

    codeBlocks.forEach(block => {
      const code = block.textContent;
      const language = this.detectLanguage(block);

      if (style === 'fenced') {
        const markdown = `\`\`\`${language}\n${code}\n\`\`\``;
        result = result.replace(block.outerHTML, markdown);
      } else {
        const indented = code.split('\n').map(line => `    ${line}`).join('\n');
        result = result.replace(block.outerHTML, indented);
      }
    });

    // Strip remaining HTML tags
    const tempDoc = parser.parseFromString(result, 'text/html');
    return tempDoc.body.textContent || result;
  }

  detectLanguage(codeBlock) {
    const classList = codeBlock.className;
    const langMatch = classList.match(/language-(\w+)/);
    return langMatch ? langMatch[1] : '';
  }

  formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }

  generateFilename() {
    const title = sanitizeFilename(this.data.title);
    const date = new Date().toISOString().split('T')[0];
    return `${title}_${date}.md`;
  }
}
