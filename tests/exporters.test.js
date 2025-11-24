import { describe, it, expect, beforeEach } from 'vitest';
import { JSONExporter } from '../src/exporters/json.js';
import { TextExporter } from '../src/exporters/text.js';
import { MarkdownExporter } from '../src/exporters/markdown.js';

describe('JSONExporter', () => {
  let mockConversationData;

  beforeEach(() => {
    mockConversationData = {
      title: 'Test Conversation',
      conversationId: 'test-123',
      url: 'https://chat.openai.com/c/test-123',
      messages: [
        {
          index: 0,
          role: 'user',
          content: {
            text: 'Hello, how are you?',
            html: '<p>Hello, how are you?</p>',
            hasCode: false,
          },
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          index: 1,
          role: 'assistant',
          content: {
            text: 'I am doing well, thank you!',
            html: '<p>I am doing well, thank you!</p>',
            hasCode: false,
          },
          timestamp: '2024-01-15T10:00:05Z',
        },
      ],
    };
  });

  it('should export conversation as JSON', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export();

    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('mimeType');
    expect(result.mimeType).toBe('application/json');
  });

  it('should generate valid JSON output', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export();

    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it('should include metadata by default', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export();
    const parsed = JSON.parse(result.content);

    expect(parsed).toHaveProperty('metadata');
    expect(parsed.metadata).toHaveProperty('exportedAt');
    expect(parsed.metadata).toHaveProperty('url');
    expect(parsed.metadata).toHaveProperty('messageCount');
    expect(parsed.metadata.messageCount).toBe(2);
  });

  it('should exclude metadata when option is false', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export({ includeMetadata: false });
    const parsed = JSON.parse(result.content);

    expect(parsed).not.toHaveProperty('metadata');
  });

  it('should exclude raw HTML by default', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export();
    const parsed = JSON.parse(result.content);

    expect(parsed.messages[0].html).toBeUndefined();
  });

  it('should include raw HTML when option is true', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export({ includeRawHTML: true });
    const parsed = JSON.parse(result.content);

    expect(parsed.messages[0].html).toBe('<p>Hello, how are you?</p>');
  });

  it('should generate compact JSON when pretty is false', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export({ pretty: false });

    expect(result.content).not.toContain('\n  ');
  });

  it('should generate pretty JSON by default', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('\n  ');
  });

  it('should generate filename with sanitized title and date', () => {
    const exporter = new JSONExporter(mockConversationData);
    const result = exporter.export();

    expect(result.filename).toMatch(/test_conversation_\d{4}-\d{2}-\d{2}\.json/);
  });
});

describe('TextExporter', () => {
  let mockConversationData;

  beforeEach(() => {
    mockConversationData = {
      title: 'Test Conversation',
      conversationId: 'test-123',
      url: 'https://chat.openai.com/c/test-123',
      messages: [
        {
          index: 0,
          role: 'user',
          content: {
            text: 'Hello, how are you?',
            hasCode: false,
          },
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          index: 1,
          role: 'assistant',
          content: {
            text: 'I am doing well!',
            hasCode: false,
          },
          timestamp: '2024-01-15T10:00:05Z',
        },
      ],
    };
  });

  it('should export conversation as plain text', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export();

    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('mimeType');
    expect(result.mimeType).toBe('text/plain');
  });

  it('should include title in output', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('Test Conversation');
  });

  it('should include role labels', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('[USER]');
    expect(result.content).toContain('[ASSISTANT]');
  });

  it('should include message content', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('Hello, how are you?');
    expect(result.content).toContain('I am doing well!');
  });

  it('should include metadata by default', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('Conversation ID: test-123');
    expect(result.content).toContain('Messages: 2');
  });

  it('should exclude metadata when option is false', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export({ includeMetadata: false });

    expect(result.content).not.toContain('Conversation ID');
  });

  it('should exclude timestamps by default', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).not.toContain('2024-01-15');
  });

  it('should include timestamps when option is true', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export({ includeTimestamps: true });

    expect(result.content).toMatch(/\(\d+\/\d+\/\d+/); // Date format
  });

  it('should use custom separator', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export({ separator: '\n***\n' });

    expect(result.content).toContain('\n***\n');
  });

  it('should generate filename with sanitized title and date', () => {
    const exporter = new TextExporter(mockConversationData);
    const result = exporter.export();

    expect(result.filename).toMatch(/test_conversation_\d{4}-\d{2}-\d{2}\.txt/);
  });
});

describe('MarkdownExporter', () => {
  let mockConversationData;

  beforeEach(() => {
    mockConversationData = {
      title: 'Test Conversation',
      conversationId: 'test-123',
      url: 'https://chat.openai.com/c/test-123',
      messages: [
        {
          index: 0,
          role: 'user',
          content: {
            text: 'Hello, how are you?',
            html: '<p>Hello, how are you?</p>',
            hasCode: false,
          },
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          index: 1,
          role: 'assistant',
          content: {
            text: 'I am doing well!',
            html: '<p>I am doing well!</p>',
            hasCode: false,
          },
          timestamp: '2024-01-15T10:00:05Z',
        },
      ],
    };
  });

  it('should export conversation as markdown', () => {
    const exporter = new MarkdownExporter(mockConversationData);
    const result = exporter.export();

    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('mimeType');
    expect(result.mimeType).toBe('text/markdown');
  });

  it('should include title as h1', () => {
    const exporter = new MarkdownExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('# Test Conversation');
  });

  it('should include role headers with emojis', () => {
    const exporter = new MarkdownExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('## 👤 User');
    expect(result.content).toContain('## 🤖 Assistant');
  });

  it('should include metadata section', () => {
    const exporter = new MarkdownExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('**Conversation ID:**');
    expect(result.content).toContain('**Messages:**');
  });

  it('should exclude metadata when option is false', () => {
    const exporter = new MarkdownExporter(mockConversationData);
    const result = exporter.export({ includeMetadata: false });

    expect(result.content).not.toContain('**Conversation ID:**');
  });

  it('should include timestamps when option is true', () => {
    const exporter = new MarkdownExporter(mockConversationData);
    const result = exporter.export({ includeTimestamps: true });

    expect(result.content).toMatch(/<sup>.*<\/sup>/);
  });

  it('should use horizontal rules as separators', () => {
    const exporter = new MarkdownExporter(mockConversationData);
    const result = exporter.export();

    expect(result.content).toContain('---');
  });

  it('should generate filename with .md extension', () => {
    const exporter = new MarkdownExporter(mockConversationData);
    const result = exporter.export();

    expect(result.filename).toMatch(/test_conversation_\d{4}-\d{2}-\d{2}\.md/);
  });
});
