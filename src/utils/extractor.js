/**
 * Shared ChatGPT Data Extractor
 * Can be used by Content Script (live DOM) or Offscreen Document (parsed HTML)
 *
 * @example
 * // Usage in content script (live DOM):
 * const extractor = new ChatGPTExtractor(document);
 * const data = extractor.extractConversation(window.location.href);
 *
 * @example
 * // Usage in offscreen (parsed HTML):
 * const parser = new DOMParser();
 * const doc = parser.parseFromString(html, 'text/html');
 * const extractor = new ChatGPTExtractor(doc, true); // Pass true for isStatic
 * const data = extractor.extractConversation(url);
 */
export class ChatGPTExtractor {
  /**
   * Creates a new extractor instance
   * @param {Document|Element} rootElement - The document or element to extract from
   * @param {boolean} [isStatic=false] - True if parsing static HTML (from fetch), false if live DOM
   * @throws {TypeError} If rootElement is not a valid Document or Element
   */
  constructor(rootElement = document, isStatic = false) {
    // Validate rootElement has required methods
    if (!rootElement || typeof rootElement.querySelectorAll !== 'function') {
      throw new TypeError('rootElement must be a Document or Element with querySelectorAll');
    }

    // Detect context for potential future use or debugging
    const isDocument = rootElement.nodeType === 9;  // DOCUMENT_NODE
    const isElement = rootElement.nodeType === 1;   // ELEMENT_NODE

    if (!isDocument && !isElement) {
      throw new TypeError('rootElement must be a Document or Element');
    }

    this.root = rootElement;
    this.isStatic = isStatic; // Store the flag
  }

  /**
   * Extracts conversation data from the DOM
   * @param {string} url - The conversation URL (required)
   * @returns {{title: string, messages: Array, conversationId: string, url: string, metadata: Object}} Extracted conversation data with metadata.
   * @throws {Error} If URL is not provided or extraction fails
   */
  extractConversation(url) {
    // Require URL to be passed explicitly
    if (!url || typeof url !== 'string') {
      throw new Error('URL parameter is required for extraction');
    }

    const conversation = {
      title: this.getConversationTitle(),
      timestamp: new Date().toISOString(),
      url: url,
      conversationId: this.getConversationId(url),
      messages: []
    };

    // ChatGPT uses article elements for message groups
    // We use .querySelectorAll on the root element (document or parsed body)
    const messageElements = this.root.querySelectorAll('[data-testid^="conversation-turn-"]');

    messageElements.forEach((element, index) => {
      const message = this.extractMessage(element, index);
      if (message) {
        conversation.messages.push(message);
      }
    });

    // Fallback: try alternative selectors if no messages found
    if (conversation.messages.length === 0) {
      const altMessages = this.extractMessagesAlternative();
      conversation.messages = altMessages;
    }

    // Assess completeness if static HTML
    if (this.isStatic) {
      const assessment = this.assessCompleteness(conversation);
      conversation.metadata = conversation.metadata || {}; // Ensure metadata exists
      conversation.metadata.extractionMethod = 'static-html';
      conversation.metadata.confidence = assessment.score;
      conversation.metadata.warnings = assessment.warnings;
    } else {
      conversation.metadata = conversation.metadata || {};
      conversation.metadata.extractionMethod = 'live-dom';
      conversation.metadata.confidence = 1.0; // Assume live DOM is always complete and reliable
    }

    return conversation;
  }

  /**
   * Helper to safely get the body or root element content
   * @returns {Element} The body or root element
   */
  getBody() {
    if (this.root.nodeType === 9) { // DOCUMENT_NODE
      return this.root.body;
    }
    return this.root; // Assume element is the root container
  }

  /**
   * Assesses the completeness of a conversation extracted from static HTML.
   * This helps detect truncated or incompletely rendered pages.
   * @param {Object} conversation - The extracted conversation object.
   * @returns {{score: number, warnings: string[], isReliable: boolean}} Confidence assessment.
   */
  assessCompleteness(conversation) {
    const warnings = [];
    let score = 1.0; // Start with full confidence
    const body = this.getBody();

    // Check 1: Lazy load placeholders (indicates truncated content)
    const lazyPlaceholders = this.root.querySelectorAll(
      '[class*="placeholder"], [class*="lazy"], [data-lazy]'
    );
    if (lazyPlaceholders.length > 0) {
      score -= 0.3; // Reduce score significantly
      warnings.push(`${lazyPlaceholders.length} lazy-load placeholders detected (content might be truncated).`);
    }

    // Check 2: Missing Timestamps (React client-side only)
    // Most messages should have timestamps in a complete conversation
    const messagesWithTimestamps = conversation.messages.filter(m => m.timestamp !== null);
    const timestampRatio = conversation.messages.length > 0 ? messagesWithTimestamps.length / conversation.messages.length : 0;
    if (conversation.messages.length > 0 && timestampRatio < 0.5) { // If there are messages but few have timestamps
      score -= 0.2;
      warnings.push(`Only ${Math.round(timestampRatio * 100)}% of messages have timestamps (might be incomplete React hydration).`);
    }

    // Check 3: Very few messages extracted (might be truncated or an error page)
    // Also checks for a "Load more" button which indicates more content is available
    if (conversation.messages.length < 5 && body && body.innerHTML.includes('Load more')) {
      score -= 0.4;
      warnings.push('Conversation appears truncated (very few messages extracted).');
    }

    // Check 4: Skeleton HTML indicators (indicates incomplete render)
    const skeletonIndicators = this.root.querySelectorAll(
      '[class*="skeleton"], [class*="shimmer"], [aria-busy="true"]'
    );
    if (skeletonIndicators.length > 0) {
      score -= 0.5;
      warnings.push('HTML contains loading skeletons (incomplete render).');
    }

    // Check 5: No messages extracted at all, but the HTML itself is not empty
    if (conversation.messages.length === 0 && body && body.textContent.trim().length > 100) {
        score -= 0.6; // High penalty
        warnings.push('No messages extracted despite non-empty page content (likely a parsing issue or severe truncation).');
    }


    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return {
      score: score,
      warnings: warnings,
      isReliable: score >= 0.7 // Threshold for considering reliable
    };
  }


  getConversationTitle() {
    const titleSelectors = [
      'h1',
      '[class*="text-2xl"]',
      'title'
    ];

    for (const selector of titleSelectors) {
      const element = this.root.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return 'ChatGPT Conversation';
  }

  getConversationId(url) {
    const urlMatch = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    return urlMatch ? urlMatch[1] : 'unknown';
  }

  extractMessage(element, index) {
    const role = this.getMessageRole(element);
    const content = this.getMessageContent(element);
    const timestamp = this.getMessageTimestamp(element);

    return {
      index,
      role,
      content,
      timestamp,
      raw: element.innerHTML
    };
  }

  getMessageRole(element) {
    const classList = element.className;
    const dataAttributes = element.dataset;

    if (classList.includes('user') || dataAttributes.messageAuthorRole === 'user') {
      return 'user';
    }
    if (classList.includes('assistant') || dataAttributes.messageAuthorRole === 'assistant') {
      return 'assistant';
    }

    const avatar = element.querySelector('img[alt]');
    if (avatar) {
      const alt = avatar.alt.toLowerCase(); // FIX: access .alt property
      if (alt.includes('user')) return 'user';
      if (alt.includes('chatgpt') || alt.includes('assistant')) return 'assistant';
    }

    return 'unknown';
  }

  getMessageContent(element) {
    const textContainer = element.querySelector('[class*="markdown"], .whitespace-pre-wrap, [data-message-author-role]');
    if (textContainer) {
      const codeBlocks = textContainer.querySelectorAll('pre code, code');
      codeBlocks.forEach(block => {
        block.setAttribute('data-code-block', 'true');
      });

      return {
        text: textContainer.textContent,
        html: textContainer.innerHTML,
        hasCode: codeBlocks.length > 0
      };
    }

    return {
      text: element.textContent,
      html: element.innerHTML,
      hasCode: false
    };
  }

  getMessageTimestamp(element) {
    const timeElement = element.querySelector('time');
    if (timeElement) {
      return timeElement.getAttribute('datetime') || timeElement.textContent;
    }
    return null;
  }

  extractMessagesAlternative() {
    const messages = [];
    const groups = this.root.querySelectorAll('.group, [class*="group/conversation-turn"]');

    groups.forEach((group, index) => {
      const textContent = group.textContent;
      if (textContent && textContent.trim()) {
        messages.push({
          index,
          role: 'unknown', // Safer default
          content: {
            text: textContent.trim(),
            html: group.innerHTML,
            hasCode: group.querySelector('code') !== null
          },
          timestamp: null,
          raw: group.innerHTML
        });
      }
    });

    return messages;
  }
}
