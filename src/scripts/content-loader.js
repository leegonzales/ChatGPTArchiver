/**
 * Content Script Loader
 * Dynamically imports the main content script module to enable ES6 modules in content scripts.
 */
(async () => {
  const src = chrome.runtime.getURL('src/scripts/content-main.js');
  await import(src);
})();
