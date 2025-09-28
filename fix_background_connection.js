const fs = require('fs');

console.log('🔧 Fixing background script connection handling...');

// Read the current background.js file
let content = fs.readFileSync('public/background.js', 'utf8');

// Add connection tracking to prevent multiple connections
const oldSetupEventListeners = `  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Extension installed:', details);
    });

    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle popup connection
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'popup-connection') {
        console.log('Popup connected');
        
        port.onMessage.addListener((message) => {
          this.handlePopupMessage(message, port);
        });

        port.onDisconnect.addListener(() => {
          console.log('Popup disconnected');
        });

        // Send initial status
        port.postMessage({
          type: 'connected',
          isExecuting: this.isExecuting
        });
      }
    });
  }`;

const newSetupEventListeners = `  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Extension installed:', details);
    });

    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle popup connection
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'popup-connection') {
        console.log('Popup connected');
        
        // Store the port reference
        this.currentPort = port;
        
        port.onMessage.addListener((message) => {
          this.handlePopupMessage(message, port);
        });

        port.onDisconnect.addListener(() => {
          console.log('Popup disconnected');
          this.currentPort = null;
        });

        // Send initial status
        this.safePostMessage(port, {
          type: 'connected',
          isExecuting: this.isExecuting
        });
      }
    });
  }`;

// Replace the old setupEventListeners
content = content.replace(oldSetupEventListeners, newSetupEventListeners);

// Add safePostMessage method
const safePostMessageMethod = `
  // Safe method to post messages to port
  safePostMessage(port, message) {
    try {
      if (port && typeof port.postMessage === 'function') {
        port.postMessage(message);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to post message:', error);
      return false;
    }
  }`;

// Add the safePostMessage method after the constructor
content = content.replace(
  /constructor\(\) \{[\s\S]*?\n  \}/,
  `constructor() {
    this.isExecuting = false;
    this.currentTask = null;
    this.currentPort = null;
    this.setupEventListeners();
  }${safePostMessageMethod}`
);

// Update all port.postMessage calls to use safePostMessage
content = content.replace(/port\.postMessage\(/g, 'this.safePostMessage(port, ');

// Write the updated content
fs.writeFileSync('public/background.js', content);

console.log('✅ Background script connection handling improved!');
console.log('✅ Added safe message posting');
console.log('✅ Better connection tracking');
console.log('✅ Prevented connection errors');
console.log('✅ Ready to rebuild extension...');
