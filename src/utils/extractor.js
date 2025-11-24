/**
 * Shared ChatGPT Data Extractor
 * Can be used by Content Script (live DOM) or Offscreen Document (parsed HTML)
 */

export class ChatGPTExtractor {
  constructor(rootElement = document) {
    this.root = rootElement;
  }

  extractConversation(url = window.location.href) {
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

    return conversation;
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
      const alt = avatar.alt.toLowerCase();
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
        text: textContainer.innerText || textContainer.textContent,
        html: textContainer.innerHTML,
        hasCode: codeBlocks.length > 0
      };
    }

    return {
      text: element.innerText || element.textContent,
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
      const textContent = group.innerText || group.textContent;
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
