/**
 * JSON Exporter
 * Exports conversation data as structured JSON with full metadata
 */

import { sanitizeFilename } from '../utils/common.js';

export class JSONExporter {
  constructor(conversationData) {
    this.data = conversationData;
  }

  export(options = {}) {
    const {
      pretty = true,
      includeRawHTML = false,
      includeMetadata = true
    } = options;

    const exportData = this.buildExportData(includeRawHTML, includeMetadata);
    const json = pretty
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    return {
      content: json,
      filename: this.generateFilename(),
      mimeType: 'application/json'
    };
  }

  buildExportData(includeRawHTML, includeMetadata) {
    const data = {
      title: this.data.title,
      conversationId: this.data.conversationId,
      messages: this.data.messages.map(msg => ({
        index: msg.index,
        role: msg.role,
        content: msg.content.text,
        html: includeRawHTML ? msg.content.html : undefined,
        hasCode: msg.content.hasCode,
        timestamp: msg.timestamp
      }))
    };

    if (includeMetadata) {
      data.metadata = {
        exportedAt: new Date().toISOString(),
        url: this.data.url,
        messageCount: this.data.messages.length,
        exporterVersion: '1.0.0'
      };
    }

    return data;
  }

  generateFilename() {
    const title = sanitizeFilename(this.data.title);
    const date = new Date().toISOString().split('T')[0];
    return `${title}_${date}.json`;
  }
}
