/**
 * ChatGPT Archiver - Popup Script
 * Handles UI interactions and export triggers
 */

class PopupController {
  constructor() {
    this.selectedFormat = null;
    this.currentMode = 'current';
    this.conversationData = null;
    this.batchConversations = [];
    this.selectedBatchIds = new Set();

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadCurrentConversation();
  }

  setupEventListeners() {
    // Mode toggle
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchMode(e.target.closest('.mode-btn').dataset.mode);
      });
    });

    // Format selection
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectFormat(e.target.closest('.format-btn').dataset.format);
      });
    });

    // Export button
    document.getElementById('export-btn').addEventListener('click', () => {
      this.handleExport();
    });

    // Batch export button
    document.getElementById('batch-export-btn').addEventListener('click', () => {
      this.handleBatchExport();
    });
  }

  switchMode(mode) {
    this.currentMode = mode;

    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Toggle panels
    document.getElementById('current-export').classList.toggle('hidden', mode !== 'current');
    document.getElementById('batch-export').classList.toggle('hidden', mode !== 'batch');

    // Load batch conversations if switching to batch mode
    if (mode === 'batch') {
      this.loadBatchConversations();
    }
  }

  selectFormat(format) {
    this.selectedFormat = format;

    // Update button states
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.format === format);
    });

    // Enable export button
    document.getElementById('export-btn').disabled = false;
  }

  async loadCurrentConversation() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if on ChatGPT
      if (!tab.url.includes('chat.openai.com') && !tab.url.includes('chatgpt.com')) {
        this.showStatus('Please open a ChatGPT conversation to export', 'error');
        return;
      }

      // Request conversation data from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_CONVERSATION'
      });

      if (response && response.success) {
        this.conversationData = response.data;
        this.showStatus(`Ready to export: ${response.data.title}`, 'success');
      } else {
        this.showStatus('Could not extract conversation data', 'error');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      this.showStatus('Error: Make sure you refresh the ChatGPT page', 'error');
    }
  }

  async loadBatchConversations() {
    try {
      const listEl = document.getElementById('batch-list');
      listEl.innerHTML = '<div class="loading">Loading conversations...</div>';

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_ALL_CONVERSATIONS'
      });

      if (response && response.success && response.data.length > 0) {
        this.batchConversations = response.data;
        this.renderBatchList();
      } else {
        listEl.innerHTML = '<div class="loading">No conversations found</div>';
      }
    } catch (error) {
      console.error('Error loading batch conversations:', error);
      document.getElementById('batch-list').innerHTML =
        '<div class="loading">Error loading conversations</div>';
    }
  }

  renderBatchList() {
    const listEl = document.getElementById('batch-list');
    listEl.innerHTML = '';

    this.batchConversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'batch-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `batch-${conv.id}`;
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedBatchIds.add(conv.id);
        } else {
          this.selectedBatchIds.delete(conv.id);
        }
        this.updateBatchExportButton();
      });

      const label = document.createElement('label');
      label.htmlFor = `batch-${conv.id}`;
      label.textContent = conv.title || 'Untitled';

      item.appendChild(checkbox);
      item.appendChild(label);
      listEl.appendChild(item);
    });
  }

  updateBatchExportButton() {
    const btn = document.getElementById('batch-export-btn');
    btn.disabled = this.selectedBatchIds.size === 0;
    btn.textContent = this.selectedBatchIds.size > 0
      ? `Export ${this.selectedBatchIds.size} Selected`
      : 'Export All Selected';
  }

  async handleExport() {
    if (!this.selectedFormat || !this.conversationData) {
      this.showStatus('Please select a format and ensure conversation is loaded', 'error');
      return;
    }

    try {
      this.showStatus('Exporting...', 'info');

      const options = this.getExportOptions();
      
      // Delegate export generation to background -> offscreen
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_SINGLE',
        payload: {
          data: this.conversationData,
          format: this.selectedFormat,
          options
        }
      });

      if (response && response.success) {
        this.showStatus('Export successful!', 'success');
      } else {
        throw new Error(response ? response.error : 'Unknown error');
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showStatus(`Export failed: ${error.message}`, 'error');
    }
  }

  async handleBatchExport() {
    if (this.selectedBatchIds.size === 0) {
      this.showStatus('Please select conversations to export', 'error');
      return;
    }

    try {
      this.showStatus('Exporting batch...', 'info');

      const format = document.getElementById('batch-format').value;
      const options = this.getExportOptions();

      // Send batch export request to background script
      await chrome.runtime.sendMessage({
        type: 'BATCH_EXPORT',
        conversationIds: Array.from(this.selectedBatchIds),
        format,
        options
      });

      this.showStatus(`Exporting ${this.selectedBatchIds.size} conversations...`, 'success');
    } catch (error) {
      console.error('Batch export error:', error);
      this.showStatus(`Batch export failed: ${error.message}`, 'error');
    }
  }

  getExportOptions() {
    return {
      includeMetadata: document.getElementById('opt-metadata')?.checked ?? true,
      includeTimestamps: document.getElementById('opt-timestamps')?.checked ?? true,
      preserveCode: document.getElementById('opt-code')?.checked ?? false
    };
  }

  showStatus(message, type = 'info') {
    const banner = document.getElementById('status-banner');
    const messageEl = document.getElementById('status-message');

    messageEl.textContent = message;
    banner.className = `status-banner ${type}`;

    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 5000);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});