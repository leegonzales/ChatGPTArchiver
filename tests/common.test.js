import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../src/utils/common.js';

describe('sanitizeFilename', () => {
  it('should replace special characters with underscores', () => {
    const input = 'Hello World! How are you?';
    const result = sanitizeFilename(input);
    expect(result).toBe('hello_world_how_are_you_');
  });

  it('should collapse multiple underscores into one', () => {
    const input = 'Hello___World';
    const result = sanitizeFilename(input);
    expect(result).toBe('hello_world');
  });

  it('should truncate to 50 characters', () => {
    const input = 'a'.repeat(100);
    const result = sanitizeFilename(input);
    expect(result).toHaveLength(50);
  });

  it('should convert to lowercase', () => {
    const input = 'UPPERCASE_TEXT';
    const result = sanitizeFilename(input);
    expect(result).toBe('uppercase_text');
  });

  it('should handle empty strings', () => {
    const result = sanitizeFilename('');
    expect(result).toBe('');
  });

  it('should remove slashes and backslashes', () => {
    const input = 'path/to/file\\name';
    const result = sanitizeFilename(input);
    expect(result).toBe('path_to_file_name');
  });

  it('should handle unicode characters', () => {
    const input = 'Hello 世界 🌍';
    const result = sanitizeFilename(input);
    expect(result).toBe('hello_');
  });

  it('should preserve alphanumeric characters', () => {
    const input = 'Test123File456';
    const result = sanitizeFilename(input);
    expect(result).toBe('test123file456');
  });

  it('should handle common ChatGPT conversation titles', () => {
    const input = 'How to: Build a React App (2024)';
    const result = sanitizeFilename(input);
    expect(result).toBe('how_to_build_a_react_app_2024_');
  });

  it('should prevent path traversal attacks', () => {
    const input = '../../../etc/passwd';
    const result = sanitizeFilename(input);
    expect(result).toBe('_etc_passwd');
    expect(result).not.toContain('..');
    expect(result).not.toContain('/');
  });
});
