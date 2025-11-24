/**
 * PDF Exporter
 * Exports conversation as PDF using jsPDF library
 * Note: This requires jsPDF to be loaded
 */

import { sanitizeFilename } from '../utils/common.js';

export class PDFExporter {
  constructor(conversationData) {
    this.data = conversationData;
  }

  async export(options = {}) {
    const {
      fontSize = 11,
      includeMetadata = true,
      pageFormat = 'a4'
    } = options;

    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF library not loaded. PDF export requires jsPDF.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: pageFormat
    });

    await this.buildPDF(doc, fontSize, includeMetadata);

    const pdfBlob = doc.output('blob');

    return {
      content: pdfBlob,
      filename: this.generateFilename(),
      mimeType: 'application/pdf',
      isBlob: true
    };
  }

  async buildPDF(doc, fontSize, includeMetadata) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);

    let yPos = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    yPos = this.addText(doc, this.data.title, margin, yPos, maxWidth, pageHeight);
    yPos += 5;

    // Metadata
    if (includeMetadata) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100);

      yPos = this.addText(doc, `Exported: ${new Date().toLocaleString()}`, margin, yPos, maxWidth, pageHeight);
      yPos = this.addText(doc, `Messages: ${this.data.messages.length}`, margin, yPos, maxWidth, pageHeight);
      yPos += 5;

      doc.setTextColor(0);
    }

    // Line separator
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Messages
    doc.setFontSize(fontSize);

    for (const msg of this.data.messages) {
      yPos = await this.addMessage(doc, msg, margin, yPos, maxWidth, pageHeight, fontSize);
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  }

  async addMessage(doc, msg, margin, yPos, maxWidth, pageHeight, fontSize) {
    const checkPageBreak = (height) => {
      if (yPos + height > pageHeight - 20) {
        doc.addPage();
        return margin;
      }
      return yPos;
    };

    // Role header
    doc.setFont(undefined, 'bold');
    doc.setFontSize(fontSize + 1);
    const roleLabel = msg.role === 'user' ? 'You' : 'ChatGPT';
    yPos = checkPageBreak(10);
    doc.text(roleLabel, margin, yPos);
    yPos += 6;

    // Timestamp
    if (msg.timestamp) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);
      yPos = checkPageBreak(5);
      doc.text(this.formatTimestamp(msg.timestamp), margin, yPos);
      yPos += 5;
      doc.setTextColor(0);
    }

    // Content
    doc.setFont(undefined, 'normal');
    doc.setFontSize(fontSize);
    yPos = checkPageBreak(10);
    yPos = this.addText(doc, msg.content.text, margin + 5, yPos, maxWidth - 5, pageHeight);
    yPos += 8;

    // Separator
    doc.setDrawColor(230);
    yPos = checkPageBreak(5);
    doc.line(margin, yPos, margin + maxWidth, yPos);
    yPos += 8;

    return yPos;
  }

  addText(doc, text, x, y, maxWidth, pageHeight) {
    const lines = doc.splitTextToSize(text, maxWidth);

    lines.forEach((line, idx) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 15;
      }
      doc.text(line, x, y);
      y += 5;
    });

    return y;
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
    return `${title}_${date}.pdf`;
  }
}
