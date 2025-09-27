/* global chrome */

console.log('Social Shopping Agent Content Script Loading...');

// Simple content script for Chrome extension
class ContentScript {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'GET_PAGE_INFO':
          const pageInfo = this.getPageInfo();
          sendResponse({ success: true, data: pageInfo });
          break;

        case 'HIGHLIGHT_ELEMENTS':
          this.highlightElements(message.selector);
          sendResponse({ success: true });
          break;

        case 'CLICK_ELEMENT':
          this.clickElement(message.selector);
          sendResponse({ success: true });
          break;

        case 'TYPE_TEXT':
          this.typeText(message.selector, message.text);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      elements: this.getInteractiveElements()
    };
  }

  getInteractiveElements() {
    const elements = [];
    const selectors = [
      'button',
      'input',
      'a',
      '[role="button"]',
      '[onclick]',
      '.btn',
      '.button'
    ];

    selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      found.forEach((el, index) => {
        if (el.offsetParent !== null) { // Only visible elements
          elements.push({
            selector: selector,
            index: index,
            text: el.textContent?.trim() || '',
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            type: el.type || '',
            href: el.href || ''
          });
        }
      });
    });

    return elements.slice(0, 50); // Limit to 50 elements
  }

  highlightElements(selector) {
    // Remove existing highlights
    this.removeHighlights();
    
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
      el.style.outline = '2px solid #00ff88';
      el.style.outlineOffset = '2px';
      el.setAttribute('data-extension-highlight', 'true');
    });
  }

  removeHighlights() {
    const highlighted = document.querySelectorAll('[data-extension-highlight]');
    highlighted.forEach(el => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.removeAttribute('data-extension-highlight');
    });
  }

  clickElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
    }
  }

  typeText(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// Initialize content script
new ContentScript();
