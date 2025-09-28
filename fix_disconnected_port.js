const fs = require('fs');

console.log('🔧 Fixing disconnected port error...');

// Read the current background.js file
let content = fs.readFileSync('public/background.js', 'utf8');

// Fix the safePostMessage function to handle disconnected ports properly
const oldSafePostMessage = `  // Safe method to post messages to port
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

const newSafePostMessage = `  // Safe method to post messages to port
  safePostMessage(port, message) {
    try {
      // Check if port is still connected
      if (!port || typeof port.postMessage !== 'function') {
        console.log('Port is not available or disconnected');
        return false;
      }
      
      // Check if port is still connected by testing if it has the onDisconnect listener
      if (port.onDisconnect && port.onDisconnect._listeners && port.onDisconnect._listeners.length === 0) {
        console.log('Port appears to be disconnected');
        return false;
      }
      
      port.postMessage(message);
      return true;
    } catch (error) {
      // Handle specific disconnected port error
      if (error.message && error.message.includes('disconnected port')) {
        console.log('Port disconnected, skipping message');
        return false;
      }
      console.error('Failed to post message:', error);
      return false;
    }
  }`;

// Replace the old safePostMessage function
content = content.replace(oldSafePostMessage, newSafePostMessage);

// Also add a check in the handleNewTask function to prevent sending messages after disconnection
const oldHandleNewTask = `  async handleNewTask(task, port) {
    console.log('New task received:', task);
    
    this.isExecuting = true;
    this.currentTask = task;

    // Send task start message
    port.postMessage({
      type: 'task_start'
    });

    try {
      // Execute real web automation
      await this.executeTaskExecution(task, port);
      
      // Send completion message
      port.postMessage({
        type: 'task_complete',
        result: {
          response: \`Task completed: \${task}\`,
          isMarkdown: false
        }
      });

    } catch (error) {
      port.postMessage({
        type: 'task_error',
        error: error.message
      });
    } finally {
      this.isExecuting = false;
      this.currentTask = null;
    }
  }`;

const newHandleNewTask = `  async handleNewTask(task, port) {
    console.log('New task received:', task);
    
    this.isExecuting = true;
    this.currentTask = task;

    // Send task start message
    this.safePostMessage(port, {
      type: 'task_start'
    });

    try {
      // Execute real web automation
      await this.executeTaskExecution(task, port);
      
      // Send completion message
      this.safePostMessage(port, {
        type: 'task_complete',
        result: {
          response: \`Task completed: \${task}\`,
          isMarkdown: false
        }
      });

    } catch (error) {
      this.safePostMessage(port, {
        type: 'task_error',
        error: error.message
      });
    } finally {
      this.isExecuting = false;
      this.currentTask = null;
    }
  }`;

// Replace the old handleNewTask function
content = content.replace(oldHandleNewTask, newHandleNewTask);

// Also update the port disconnection handler to clean up properly
const oldPortDisconnect = `        port.onDisconnect.addListener(() => {
          console.log('Popup disconnected');
          this.currentPort = null;
        });`;

const newPortDisconnect = `        port.onDisconnect.addListener(() => {
          console.log('Popup disconnected');
          this.currentPort = null;
          this.isExecuting = false;
          this.currentTask = null;
        });`;

// Replace the old port disconnect handler
content = content.replace(oldPortDisconnect, newPortDisconnect);

// Write the updated content
fs.writeFileSync('public/background.js', content);

console.log('✅ Disconnected port error fixed!');
console.log('✅ Added proper port validation');
console.log('✅ Better error handling for disconnected ports');
console.log('✅ Cleanup on port disconnection');
console.log('✅ Ready to rebuild extension...');
