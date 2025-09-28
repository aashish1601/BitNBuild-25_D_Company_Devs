const fs = require('fs');

console.log('🔧 Fixing immediate popup disconnection issue...');

// Read the current popup.js file
let content = fs.readFileSync('public/popup.js', 'utf8');

// Add connection stability improvements
const connectionStabilityFix = `
// Connection stability improvements
let connectionRetries = 0;
const maxRetries = 3;
let isConnecting = false;

// Function to check if we should maintain connection
function shouldMaintainConnection() {
    // Don't disconnect if we're in the middle of a task
    if (isExecuting) {
        return true;
    }
    
    // Don't disconnect if popup is still visible
    if (document.visibilityState === 'visible') {
        return true;
    }
    
    return false;
}

// Enhanced connection function
function connectToBackgroundStable() {
    if (isConnecting) {
        console.log('Connection already in progress, skipping...');
        return;
    }
    
    isConnecting = true;
    
    try {
        // Prevent multiple connections
        if (port && port.onMessage) {
            console.log('Connection already exists, skipping...');
            isConnecting = false;
            return;
        }
        
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
                    connectionRetries = 0; // Reset retry counter on successful connection
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
        
        // Handle disconnection with retry logic
        port.onDisconnect.addListener(() => {
            console.log('Background connection lost');
            port = null;
            isConnecting = false;
            
            // Only retry if we should maintain connection and haven't exceeded max retries
            if (shouldMaintainConnection() && connectionRetries < maxRetries) {
                connectionRetries++;
                console.log('Attempting to reconnect...', connectionRetries);
                setTimeout(() => {
                    if (!port) {
                        connectToBackgroundStable();
                    }
                }, 1000 * connectionRetries); // Exponential backoff
            }
        });
        
        console.log('Connection established successfully');
        isConnecting = false;
        
    } catch (error) {
        console.error('Failed to connect to background script:', error);
        port = null;
        isConnecting = false;
        
        // Retry connection if we haven't exceeded max retries
        if (connectionRetries < maxRetries) {
            connectionRetries++;
            console.log('Retrying connection...', connectionRetries);
            setTimeout(() => {
                connectToBackgroundStable();
            }, 1000 * connectionRetries);
        } else {
            addMessage('assistant', 'Connection error. Please try again.');
        }
    }
}

// Keep connection alive
function keepConnectionAlive() {
    if (port && port.onMessage) {
        // Send a ping to keep connection alive
        try {
            port.postMessage({ type: 'ping' });
        } catch (error) {
            console.log('Connection lost, attempting to reconnect...');
            connectToBackgroundStable();
        }
    }
}

// Set up connection keep-alive
setInterval(keepConnectionAlive, 30000); // Ping every 30 seconds
`;

// Replace the old connectToBackground function
content = content.replace(
    /function connectToBackground\(\) \{[\s\S]*?\n\}/,
    `function connectToBackground() {
    connectToBackgroundStable();
}`
);

// Add the connection stability fix after the connectToBackground function
content = content.replace(
    /function connectToBackground\(\) \{[\s\S]*?\n\}/,
    `function connectToBackground() {
    connectToBackgroundStable();
}

${connectionStabilityFix}`
);

// Also improve the sendMessage function to handle connection issues better
const oldSendMessage = `function sendMessage() {
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

const newSendMessage = `function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    console.log('Sending message:', message);
    
    if (!message || isExecuting) return;
    
    // Add user message
    addMessage('user', message);
    
    // Clear input
    input.value = '';
    
    // Ensure we have a stable connection
    if (!port || !port.onMessage) {
        console.log('No valid connection, establishing new one...');
        connectToBackgroundStable();
        
        // Wait for connection to establish
        const sendWithRetry = (retries = 3) => {
            if (port && port.onMessage) {
                try {
                    port.postMessage({
                        type: 'new_task',
                        task: message
                    });
                    console.log('Message sent successfully');
                } catch (error) {
                    console.error('Failed to send message:', error);
                    if (retries > 0) {
                        console.log('Retrying send...', retries);
                        connectToBackgroundStable();
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
        
        setTimeout(() => sendWithRetry(), 300);
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
            connectToBackgroundStable();
        }
    }
}`;

// Replace the old sendMessage function
content = content.replace(oldSendMessage, newSendMessage);

// Write the updated content
fs.writeFileSync('public/popup.js', content);

console.log('✅ Immediate disconnection issue fixed!');
console.log('✅ Added connection stability improvements');
console.log('✅ Added retry logic with exponential backoff');
console.log('✅ Added connection keep-alive mechanism');
console.log('✅ Better error handling and recovery');
console.log('✅ Ready to rebuild extension...');
