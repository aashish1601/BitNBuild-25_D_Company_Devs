const fs = require('fs');

console.log('🔧 Fixing connection stability issues...');

// Read the current popup.js file
let content = fs.readFileSync('public/popup.js', 'utf8');

// Replace the connectToBackground function with a more stable version
const oldConnectFunction = `// Function to establish connection to background script
function connectToBackground() {
    try {
        // Clean up existing connection
        if (port) {
            try {
                port.disconnect();
            } catch (e) {
                console.log('Port already disconnected');
            }
            port = null;
        }
        
        // Create new connection
        port = chrome.runtime.connect({ name: 'popup-connection' });
        
        // Set up message listener
        port.onMessage.addListener((message) => {
            console.log('Message from background:', message);
            
            switch (message.type) {
                case 'connected':
                    console.log('Connected to background script');
                    break;
                    
                case 'task_start':
                    isExecuting = true;
                    addMessage('assistant', 'Starting task execution...');
                    break;
                    
                case 'status_update':
                    addMessage('assistant', message.message);
                    break;
                    
                case 'step_complete':
                    addMessage('assistant', message.message);
                    break;
                    
                case 'task_complete':
                    isExecuting = false;
                    addMessage('assistant', message.result.response);
                    break;
                    
                case 'task_error':
                    isExecuting = false;
                    addMessage('assistant', 'Error: ' + message.error);
                    break;
                    
                case 'task_cancelled':
                    isExecuting = false;
                    addMessage('assistant', 'Task cancelled by user');
                    break;
            }
        });
        
        // Handle disconnection
        port.onDisconnect.addListener(() => {
            console.log('Background connection lost');
            port = null;
            // Don't auto-reconnect to avoid infinite loops
        });
        
        console.log('Connection established successfully');
        
    } catch (error) {
        console.error('Failed to connect to background script:', error);
        port = null;
        addMessage('assistant', 'Connection error. Please try again.');
    }
}`;

const newConnectFunction = `// Function to establish connection to background script
function connectToBackground() {
    // Prevent multiple connections
    if (port && port.onMessage) {
        console.log('Connection already exists, skipping...');
        return;
    }
    
    try {
        // Clean up existing connection
        if (port) {
            try {
                port.disconnect();
            } catch (e) {
                console.log('Port already disconnected');
            }
            port = null;
        }
        
        // Create new connection
        port = chrome.runtime.connect({ name: 'popup-connection' });
        
        // Set up message listener
        port.onMessage.addListener((message) => {
            console.log('Message from background:', message);
            
            switch (message.type) {
                case 'connected':
                    console.log('Connected to background script');
                    break;
                    
                case 'task_start':
                    isExecuting = true;
                    addMessage('assistant', 'Starting task execution...');
                    break;
                    
                case 'status_update':
                    addMessage('assistant', message.message);
                    break;
                    
                case 'step_complete':
                    addMessage('assistant', message.message);
                    break;
                    
                case 'task_complete':
                    isExecuting = false;
                    addMessage('assistant', message.result.response);
                    break;
                    
                case 'task_error':
                    isExecuting = false;
                    addMessage('assistant', 'Error: ' + message.error);
                    break;
                    
                case 'task_cancelled':
                    isExecuting = false;
                    addMessage('assistant', 'Task cancelled by user');
                    break;
            }
        });
        
        // Handle disconnection
        port.onDisconnect.addListener(() => {
            console.log('Background connection lost');
            port = null;
            // Don't auto-reconnect to avoid infinite loops
        });
        
        console.log('Connection established successfully');
        
    } catch (error) {
        console.error('Failed to connect to background script:', error);
        port = null;
        addMessage('assistant', 'Connection error. Please try again.');
    }
}`;

// Replace the old connect function
content = content.replace(oldConnectFunction, newConnectFunction);

// Also improve the sendMessage function to prevent multiple connections
const oldSendMessage = `function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    console.log('Sending message:', message);
    
    if (!message || isExecuting) return;
    
    // Add user message
    addMessage('user', message);
    
    // Clear input
    input.value = '';
    
    // Ensure we have a valid connection
    if (!port || port.onDisconnect) {
        console.log('Port not connected, establishing new connection...');
        connectToBackground();
        
        // Wait for connection to be established
        const sendWithRetry = (retries = 3) => {
            if (port && !port.onDisconnect) {
                try {
                    port.postMessage({
                        type: 'new_task',
                        task: message
                    });
                    console.log('Message sent successfully');
                } catch (error) {
                    console.error('Failed to send message:', error);
                    if (retries > 0) {
                        console.log('Retrying...', retries);
                        connectToBackground();
                        setTimeout(() => sendWithRetry(retries - 1), 500);
                    } else {
                        addMessage('assistant', 'Failed to send message. Please try again.');
                    }
                }
            } else if (retries > 0) {
                console.log('Port not ready, retrying...', retries);
                setTimeout(() => sendWithRetry(retries - 1), 500);
            } else {
                addMessage('assistant', 'Connection failed. Please try again.');
            }
        };
        
        setTimeout(() => sendWithRetry(), 100);
    } else {
        try {
            port.postMessage({
                type: 'new_task',
                task: message
            });
            console.log('Message sent successfully');
        } catch (error) {
            console.error('Failed to send message:', error);
            addMessage('assistant', 'Failed to send message. Please try again.');
            // Try to reconnect
            connectToBackground();
        }
    }
}`;

const newSendMessage = `function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    console.log('Sending message:', message);
    
    if (!message || isExecuting) return;
    
    // Add user message
    addMessage('user', message);
    
    // Clear input
    input.value = '';
    
    // Check if we have a valid connection
    if (!port || !port.onMessage) {
        console.log('No valid connection, establishing new one...');
        connectToBackground();
        
        // Wait a moment for connection to establish
        setTimeout(() => {
            if (port && port.onMessage) {
                try {
                    port.postMessage({
                        type: 'new_task',
                        task: message
                    });
                    console.log('Message sent successfully');
                } catch (error) {
                    console.error('Failed to send message:', error);
                    addMessage('assistant', 'Failed to send message. Please try again.');
                }
            } else {
                addMessage('assistant', 'Connection failed. Please try again.');
            }
        }, 200);
    } else {
        try {
            port.postMessage({
                type: 'new_task',
                task: message
            });
            console.log('Message sent successfully');
        } catch (error) {
            console.error('Failed to send message:', error);
            addMessage('assistant', 'Failed to send message. Please try again.');
            // Try to reconnect
            connectToBackground();
        }
    }
}`;

// Replace the old sendMessage function
content = content.replace(oldSendMessage, newSendMessage);

// Also add a connection check function
const connectionCheckFunction = `
// Function to check if port is connected
function isPortConnected() {
    return port && port.onMessage && typeof port.postMessage === 'function';
}

// Function to safely send messages
function safeSendMessage(message) {
    if (isPortConnected()) {
        try {
            port.postMessage(message);
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }
    return false;
}`;

// Add the connection check function after the connectToBackground function
content = content.replace(
    /function connectToBackground\(\) \{[\s\S]*?\n\}/,
    `function connectToBackground() {${newConnectFunction.match(/function connectToBackground\(\) \{([\s\S]*?)\n\}/)[1]}\n}\n\n${connectionCheckFunction}`
);

// Write the updated content
fs.writeFileSync('public/popup.js', content);

console.log('✅ Connection stability improved!');
console.log('✅ Prevented multiple connections');
console.log('✅ Added connection validation');
console.log('✅ Better error handling');
console.log('✅ Ready to rebuild extension...');
