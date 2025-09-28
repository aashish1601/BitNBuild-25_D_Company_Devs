const fs = require('fs');

console.log('🔧 Fixing recursive call stack overflow bug...');

// Read the current background.js file
let content = fs.readFileSync('public/background.js', 'utf8');

// Fix the recursive safePostMessage function
const oldSafePostMessage = `  // Safe method to post messages to port
  safePostMessage(port, message) {
    try {
      if (port && typeof port.postMessage === 'function') {
        this.safePostMessage(port, message);
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

// Replace the recursive function
content = content.replace(oldSafePostMessage, newSafePostMessage);

// Write the updated content
fs.writeFileSync('public/background.js', content);

console.log('✅ Recursive call stack overflow bug fixed!');
console.log('✅ safePostMessage now calls port.postMessage correctly');
console.log('✅ No more infinite recursion');
console.log('✅ Ready to rebuild extension...');
