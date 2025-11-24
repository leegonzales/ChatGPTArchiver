/**
 * Plain Text Exporter
 * Exports conversation as simple text file - smallest file size
 */

import { sanitizeFilename } from '../utils/common.js';

export class TextExporter {
  constructor(conversationData) {
    this.data = conversationData;
  }

  export(options = {}) {
    const {
      includeMetadata = true,
      includeTimestamps = false,
      separator = '\n---\n'
    } = options;

    const text = this.buildText(includeMetadata, includeTimestamps, separator);

    return {
      content: text,
      filename: this.generateFilename(),
      mimeType: 'text/plain'
    };
  }

  buildText(includeMetadata, includeTimestamps, separator) {
    let txt = '';

    // Header
    txt += `${this.data.title}\n`;
    txt += '='.repeat(this.data.title.length) + '\n\n';

    // Metadata
    if (includeMetadata) {
      txt += `Conversation ID: ${this.data.conversationId}\n`;
      txt += `Exported: ${new Date().toLocaleString()}\n`;
      txt += `Messages: ${this.data.messages.length}\n`;
      if (this.data.url) {
        txt += `URL: ${this.data.url}\n`;
      }
      txt += '\n';
    }

    // Messages
    this.data.messages.forEach((msg, idx) => {
      txt += this.formatMessage(msg, includeTimestamps);

      // Add separator between messages
      if (idx < this.data.messages.length - 1) {
        txt += separator;
      }
    });

    return txt;
  }

  formatMessage(msg, includeTimestamps) {
    let txt = '';

    // Role
    const roleLabel = msg.role === 'user' ? 'USER' : 'ASSISTANT';
    txt += `[${roleLabel}]`;

    // Timestamp
    if (includeTimestamps && msg.timestamp) {
      txt += ` (${this.formatTimestamp(msg.timestamp)})`;
    }

    txt += '\n';

    // Content
    txt += msg.content.text;
    txt += '\n\n';

    return txt;
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
    return `${title}_${date}.txt`;
  }
}
