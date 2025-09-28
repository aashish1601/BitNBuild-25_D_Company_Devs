const fs = require('fs');

console.log('🔧 Adding ping handler to background script...');

// Read the current background.js file
let content = fs.readFileSync('public/background.js', 'utf8');

// Add ping handler to the handlePopupMessage function
const oldHandlePopupMessage = `  async handlePopupMessage(message, port) {
    try {
      switch (message.type) {
        case 'new_task':
          await this.handleNewTask(message.task, port);
          break;

        case 'cancel_task':
          await this.handleCancelTask(port);
          break;

        case 'resume_task':
          await this.handleResumeTask(port);
          break;

        case 'get_status':
          port.postMessage({
            type: 'status_response',
            isExecuting: this.isExecuting,
            taskStatus: this.currentTask ? { status: 'executing', message: 'Task in progress...' } : null
          });
          break;

        case 'new_chat':
          this.currentTask = null;
          this.isExecuting = false;
          break;

        default:
          console.log('Unknown popup message:', message.type);
      }
    } catch (error) {
      console.error('Popup message error:', error);
      port.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }`;

const newHandlePopupMessage = `  async handlePopupMessage(message, port) {
    try {
      switch (message.type) {
        case 'new_task':
          await this.handleNewTask(message.task, port);
          break;

        case 'cancel_task':
          await this.handleCancelTask(port);
          break;

        case 'resume_task':
          await this.handleResumeTask(port);
          break;

        case 'get_status':
          this.safePostMessage(port, {
            type: 'status_response',
            isExecuting: this.isExecuting,
            taskStatus: this.currentTask ? { status: 'executing', message: 'Task in progress...' } : null
          });
          break;

        case 'new_chat':
          this.currentTask = null;
          this.isExecuting = false;
          break;

        case 'ping':
          // Handle ping to keep connection alive
          this.safePostMessage(port, {
            type: 'pong'
          });
          break;

        default:
          console.log('Unknown popup message:', message.type);
      }
    } catch (error) {
      console.error('Popup message error:', error);
      this.safePostMessage(port, {
        type: 'error',
        error: error.message
      });
    }
  }`;

// Replace the old handlePopupMessage function
content = content.replace(oldHandlePopupMessage, newHandlePopupMessage);

// Write the updated content
fs.writeFileSync('public/background.js', content);

console.log('✅ Ping handler added to background script!');
console.log('✅ Added pong response for keep-alive');
console.log('✅ Better connection stability');
console.log('✅ Ready to rebuild extension...');
