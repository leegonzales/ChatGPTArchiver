import { describe, it, expect, beforeEach } from 'vitest';
import { ChatGPTExtractor } from '../src/utils/extractor.js';

describe('ChatGPTExtractor', () => {
  let mockDocument;

  beforeEach(() => {
    // Create a basic mock document structure
    mockDocument = {
      nodeType: 9, // DOCUMENT_NODE
      body: {
        innerHTML: '<div>Test content</div>',
        textContent: 'Test content',
      },
      querySelectorAll: (selector) => [],
      querySelector: (selector) => null,
    };
  });

  describe('constructor', () => {
    it('should create an extractor instance with a valid document', () => {
      const extractor = new ChatGPTExtractor(mockDocument);
      expect(extractor).toBeDefined();
      expect(extractor.root).toBe(mockDocument);
      expect(extractor.isStatic).toBe(false);
    });

    it('should accept isStatic parameter', () => {
      const extractor = new ChatGPTExtractor(mockDocument, true);
      expect(extractor.isStatic).toBe(true);
    });

    it('should throw error for invalid root element', () => {
      expect(() => new ChatGPTExtractor(null)).toThrow(TypeError);
      expect(() => new ChatGPTExtractor({})).toThrow(TypeError);
      expect(() => new ChatGPTExtractor('string')).toThrow(TypeError);
    });

    it('should accept Element nodes (nodeType 1)', () => {
      const mockElement = {
        nodeType: 1, // ELEMENT_NODE
        querySelectorAll: () => [],
      };
      const extractor = new ChatGPTExtractor(mockElement);
      expect(extractor.root).toBe(mockElement);
    });
  });

  describe('getConversationId', () => {
    it('should extract conversation ID from ChatGPT URL', () => {
      const extractor = new ChatGPTExtractor(mockDocument);
      const url = 'https://chat.openai.com/c/abc-123-def-456';
      const id = extractor.getConversationId(url);
      expect(id).toBe('abc-123-def-456');
    });

    it('should handle chatgpt.com domain', () => {
      const extractor = new ChatGPTExtractor(mockDocument);
      const url = 'https://chatgpt.com/c/xyz-789';
      const id = extractor.getConversationId(url);
      expect(id).toBe('xyz-789');
    });

    it('should return "unknown" for invalid URLs', () => {
      const extractor = new ChatGPTExtractor(mockDocument);
      const id = extractor.getConversationId('https://example.com');
      expect(id).toBe('unknown');
    });

    it('should handle URLs with query parameters', () => {
      const extractor = new ChatGPTExtractor(mockDocument);
      const url = 'https://chat.openai.com/c/test-id-123?model=gpt-4';
      const id = extractor.getConversationId(url);
      expect(id).toBe('test-id-123');
    });
  });

  describe('getConversationTitle', () => {
    it('should extract title from h1 element', () => {
      const mockDoc = {
        nodeType: 9,
        querySelectorAll: () => [],
        querySelector: (selector) => {
          if (selector === 'h1') {
            return { textContent: '  My Conversation Title  ' };
          }
          return null;
        },
      };
      const extractor = new ChatGPTExtractor(mockDoc);
      const title = extractor.getConversationTitle();
      expect(title).toBe('My Conversation Title');
    });

    it('should fallback to default title when no h1 found', () => {
      const extractor = new ChatGPTExtractor(mockDocument);
      const title = extractor.getConversationTitle();
      expect(title).toBe('ChatGPT Conversation');
    });

    it('should try title element as fallback', () => {
      const mockDoc = {
        nodeType: 9,
        querySelectorAll: () => [],
        querySelector: (selector) => {
          if (selector === 'title') {
            return { textContent: 'Title from meta' };
          }
          return null;
        },
      };
      const extractor = new ChatGPTExtractor(mockDoc);
      const title = extractor.getConversationTitle();
      expect(title).toBe('Title from meta');
    });
  });

  describe('getMessageRole', () => {
    it('should identify user role from data attribute', () => {
      const mockElement = {
        className: '',
        dataset: { messageAuthorRole: 'user' },
        querySelector: () => null,
      };
      const extractor = new ChatGPTExtractor(mockDocument);
      const role = extractor.getMessageRole(mockElement);
      expect(role).toBe('user');
    });

    it('should identify assistant role from class name', () => {
      const mockElement = {
        className: 'message assistant',
        dataset: {},
        querySelector: () => null,
      };
      const extractor = new ChatGPTExtractor(mockDocument);
      const role = extractor.getMessageRole(mockElement);
      expect(role).toBe('assistant');
    });

    it('should identify role from avatar alt text', () => {
      const mockElement = {
        className: '',
        dataset: {},
        querySelector: (selector) => {
          if (selector === 'img[alt]') {
            return {
              getAttribute: (attr) => 'ChatGPT Avatar',
            };
          }
          return null;
        },
      };
      const extractor = new ChatGPTExtractor(mockDocument);
      const role = extractor.getMessageRole(mockElement);
      expect(role).toBe('assistant');
    });

    it('should return "unknown" for unidentifiable roles', () => {
      const mockElement = {
        className: '',
        dataset: {},
        querySelector: () => null,
      };
      const extractor = new ChatGPTExtractor(mockDocument);
      const role = extractor.getMessageRole(mockElement);
      expect(role).toBe('unknown');
    });
  });

  describe('getMessageTimestamp', () => {
    it('should extract timestamp from time element', () => {
      const mockElement = {
        querySelector: (selector) => {
          if (selector === 'time') {
            return {
              getAttribute: (attr) => '2024-01-15T10:30:00Z',
              textContent: 'Jan 15, 2024',
            };
          }
          return null;
        },
      };
      const extractor = new ChatGPTExtractor(mockDocument);
      const timestamp = extractor.getMessageTimestamp(mockElement);
      expect(timestamp).toBe('2024-01-15T10:30:00Z');
    });

    it('should fallback to textContent if no datetime attribute', () => {
      const mockElement = {
        querySelector: (selector) => {
          if (selector === 'time') {
            return {
              getAttribute: () => null,
              textContent: 'Yesterday',
            };
          }
          return null;
        },
      };
      const extractor = new ChatGPTExtractor(mockDocument);
      const timestamp = extractor.getMessageTimestamp(mockElement);
      expect(timestamp).toBe('Yesterday');
    });

    it('should return null when no time element found', () => {
      const mockElement = {
        querySelector: () => null,
      };
      const extractor = new ChatGPTExtractor(mockDocument);
      const timestamp = extractor.getMessageTimestamp(mockElement);
      expect(timestamp).toBeNull();
    });
  });

  describe('extractConversation', () => {
    it('should require URL parameter', () => {
      const extractor = new ChatGPTExtractor(mockDocument);
      expect(() => extractor.extractConversation()).toThrow('URL parameter is required');
      expect(() => extractor.extractConversation(null)).toThrow('URL parameter is required');
      expect(() => extractor.extractConversation('')).toThrow('URL parameter is required');
    });

    it('should return conversation object with basic structure', () => {
      const mockDoc = {
        nodeType: 9,
        querySelectorAll: () => [],
        querySelector: () => ({ textContent: 'Test Title' }),
      };
      const extractor = new ChatGPTExtractor(mockDoc);
      const result = extractor.extractConversation('https://chat.openai.com/c/test-123');

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('conversationId');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should set live-dom metadata for non-static extraction', () => {
      const extractor = new ChatGPTExtractor(mockDocument, false);
      const result = extractor.extractConversation('https://chat.openai.com/c/test');

      expect(result.metadata.extractionMethod).toBe('live-dom');
      expect(result.metadata.confidence).toBe(1.0);
    });

    it('should set static-html metadata for static extraction', () => {
      const extractor = new ChatGPTExtractor(mockDocument, true);
      const result = extractor.extractConversation('https://chat.openai.com/c/test');

      expect(result.metadata.extractionMethod).toBe('static-html');
      expect(result.metadata).toHaveProperty('confidence');
      expect(result.metadata).toHaveProperty('warnings');
    });
  });

  describe('assessCompleteness', () => {
    it('should return high confidence for complete conversations', () => {
      const mockConversation = {
        messages: [
          { timestamp: '2024-01-01', content: 'test' },
          { timestamp: '2024-01-02', content: 'test' },
        ],
      };
      const extractor = new ChatGPTExtractor(mockDocument, true);
      const assessment = extractor.assessCompleteness(mockConversation);

      expect(assessment.score).toBeGreaterThan(0.7);
      expect(assessment.isReliable).toBe(true);
      expect(Array.isArray(assessment.warnings)).toBe(true);
    });

    it('should detect low confidence for empty messages with content', () => {
      const mockConversation = {
        messages: [],
      };
      // Create content > 100 chars to trigger the check
      const longContent = 'a'.repeat(150);
      const mockDoc = {
        nodeType: 9,
        body: { innerHTML: `<div>${longContent}</div>`, textContent: longContent },
        querySelectorAll: () => [],
      };
      const extractor = new ChatGPTExtractor(mockDoc, true);
      const assessment = extractor.assessCompleteness(mockConversation);

      expect(assessment.score).toBeLessThan(0.7);
      expect(assessment.warnings.length).toBeGreaterThan(0);
      expect(assessment.warnings.some(w => w.includes('No messages extracted'))).toBe(true);
    });

    it('should detect missing timestamps', () => {
      const mockConversation = {
        messages: [
          { timestamp: null, content: 'test' },
          { timestamp: null, content: 'test' },
          { timestamp: null, content: 'test' },
        ],
      };
      const extractor = new ChatGPTExtractor(mockDocument, true);
      const assessment = extractor.assessCompleteness(mockConversation);

      expect(assessment.warnings.some(w => w.includes('timestamps'))).toBe(true);
    });
  });
});
