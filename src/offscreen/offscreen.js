import { PDFExporter } from '../exporters/pdf.js';
import { PNGExporter } from '../exporters/png.js';
import { ChatGPTExtractor } from '../utils/extractor.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ success: true });
    return false;
  }

  if (request.type === 'PARSE_CONVERSATION') {
    handleParse(request, sendResponse);
    return true;
  }
  
  if (request.type === 'GENERATE_EXPORT') {
    handleExport(request, sendResponse);
    return true; // Keep channel open for async response
  }
});

function handleParse(request, sendResponse) {
  try {
    const { html, url } = request;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const extractor = new ChatGPTExtractor(doc);
    const data = extractor.extractConversation(url);
    
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('Parse error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleExport(request, sendResponse) {
  try {
    const { data, format, options } = request;
    let ExporterClass;
    let result;

    switch (format) {
      case 'json':
        ({ JSONExporter: ExporterClass } = await import('../exporters/json.js'));
        break;
      case 'markdown':
        ({ MarkdownExporter: ExporterClass } = await import('../exporters/markdown.js'));
        break;
      case 'text':
        ({ TextExporter: ExporterClass } = await import('../exporters/text.js'));
        break;
      case 'html':
        ({ HTMLExporter: ExporterClass } = await import('../exporters/html.js'));
        break;
      case 'pdf':
        ExporterClass = PDFExporter;
        break;
      case 'png':
        ExporterClass = PNGExporter;
        break;
      default:
        throw new Error(`Format ${format} not supported`);
    }

    const exporter = new ExporterClass(data);
    result = await exporter.export(options);

    // If result.content is a Blob (PDF/PNG), convert to Base64.
    // If it's a string (JSON/Text/MD/HTML), pass it directly or as a Data URL.
    // Uniformity is better: Convert everything to Data URL or return object.
    // But chrome.downloads.download accepts a URL. Data URL is best for all.

    if (result.isBlob || result.content instanceof Blob) {
      const reader = new FileReader();
      reader.readAsDataURL(result.content);
      reader.onloadend = () => {
        sendResponse({
          success: true,
          data: {
            content: reader.result, // Base64 Data URL
            filename: result.filename
          }
        });
      };
      reader.onerror = () => {
        sendResponse({ success: false, error: 'Failed to convert blob to data URL' });
      };
    } else {
      // It's a string. Create a Blob from it, then Data URL.
      // This handles text encoding properly.
      const blob = new Blob([result.content], { type: result.mimeType });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        sendResponse({
          success: true,
          data: {
            content: reader.result,
            filename: result.filename
          }
        });
      };
    }

  } catch (error) {
    console.error('Offscreen export error:', error);
    sendResponse({ success: false, error: error.message });
  }
}
