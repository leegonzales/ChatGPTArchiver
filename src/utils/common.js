/**
 * Shared utilities for ChatGPTArchiver
 */

/**
 * Sanitizes a string to be safe for use as a filename
 * @param {string} filename - The original filename/title
 * @returns {string} - The sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .substring(0, 50)
    .toLowerCase();
}
