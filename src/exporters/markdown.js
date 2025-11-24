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
    if (typeof DOMParser === 'undefined') {
      return html.replace(/<[^>]*>/g, ''); // Fallback: strip tags if no parser
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Handle Fenced Code Blocks (PRE > CODE)
    const preBlocks = doc.querySelectorAll('pre');
    preBlocks.forEach(pre => {
      const code = pre.querySelector('code');
      if (code) {
        const language = this.detectLanguage(code) || '';
        const codeText = code.textContent;
        
        let markdown = '';
        if (style === 'fenced') {
          markdown = `\n\`\`\`${language}\n${codeText}\n\`\`\`\n`;
        } else {
          markdown = '\n' + codeText.split('\n').map(line => `    ${line}`).join('\n') + '\n';
        }
        
        // Replace the entire PRE element with the markdown text node
        const textNode = doc.createTextNode(markdown);
        pre.parentNode.replaceChild(textNode, pre);
      }
    });

    // 2. Handle Inline Code (CODE not in PRE)
    const inlineCodes = doc.querySelectorAll('code');
    inlineCodes.forEach(code => {
      // Verify it's still in the document (not removed with PRE)
      if (doc.contains(code)) {
        const markdown = `\`${code.textContent}\``;
        const textNode = doc.createTextNode(markdown);
        code.parentNode.replaceChild(textNode, code);
      }
    });

    // 3. Convert Paragraphs to newlines (optional but good for formatting)
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
      const textNode = doc.createTextNode(`${p.textContent}\n\n`);
      p.parentNode.replaceChild(textNode, p);
    });

    return doc.body.textContent.trim();
  }

  detectLanguage(codeBlock) {
    // ChatGPT classes: language-javascript, etc.
    const classList = codeBlock.className || '';
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
