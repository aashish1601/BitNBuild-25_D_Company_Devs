// Social Shopping Agent Popup Script
let isExecuting = false;
let currentTask = null;
let port = null;
let keepPopupOpen = false; // Flag to prevent popup closure during automation

// Function to establish connection to background script
function connectToBackground() {
    connectToBackgroundStable();
}


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
                            keepPopupOpen = true; // Prevent popup closure during automation
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
                            keepPopupOpen = false; // Allow popup closure after task completion
                            addMessage('assistant', message.result.response);
                            break;
                            
                        case 'task_error':
                            isExecuting = false;
                            keepPopupOpen = false; // Allow popup closure after error
                            addMessage('assistant', 'Error: ' + message.error);
                            break;
                            
                        case 'task_cancelled':
                            isExecuting = false;
                            keepPopupOpen = false; // Allow popup closure after cancellation
                            addMessage('assistant', 'Task cancelled by user');
                            break;
                            
                        case 'product_comparison':
                            isExecuting = false;
                            displayProductComparison(message.products, message.searchTerm);
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
}

function openChat() {
    console.log('Opening chat...');
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('chat').classList.add('active');
}

function closeChat() {
    console.log('Closing chat...');
    document.getElementById('chat').classList.remove('active');
    document.getElementById('dashboard').style.display = 'flex';
}

function sendMessage() {
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
}

function addMessage(type, text) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function showHistory() {
    alert('History feature coming soon!');
}

function showSettings() {
    alert('Settings feature coming soon!');
}

function displayProductComparison(products, searchTerm) {
    const messagesContainer = document.getElementById('messages');
    
    // Create comparison container
    const comparisonDiv = document.createElement('div');
    comparisonDiv.className = 'message assistant product-comparison';
    comparisonDiv.innerHTML = `
        <div class="comparison-header">
            <h4>🛍️ Product Comparison for "${searchTerm}"</h4>
            <p>Choose which product you'd like to add to cart:</p>
        </div>
        <div class="products-grid">
            ${products.map((product, index) => `
                <div class="product-card" data-index="${index}">
                    <div class="product-image">
                        ${product.image ? `<img src="${product.image}" alt="${product.title}" />` : '📦'}
                    </div>
                    <div class="product-info">
                        <h5 class="product-title">${product.title}</h5>
                        <div class="product-price">${product.price}</div>
                        <div class="product-rating">${product.rating}</div>
                        <div class="product-reviews">${product.reviewCount}</div>
                    </div>
                    <button class="select-product-btn" data-index="${index}">
                        Add to Cart
                    </button>
                </div>
            `).join('')}
        </div>
    `;
    
    messagesContainer.appendChild(comparisonDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add click listeners for product selection
    comparisonDiv.querySelectorAll('.select-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productIndex = parseInt(e.target.dataset.index);
            selectProduct(productIndex);
        });
    });
}

function selectProduct(productIndex) {
    if (port && port.onMessage) {
        try {
            port.postMessage({
                type: 'select_product',
                productIndex: productIndex
            });
            addMessage('user', `Selected product ${productIndex + 1} to add to cart`);
        } catch (error) {
            console.error('Failed to send product selection:', error);
            addMessage('assistant', 'Failed to select product. Please try again.');
        }
    } else {
        addMessage('assistant', 'Connection lost. Please try again.');
    }
}

function closeWindow() {
    if (keepPopupOpen || isExecuting) {
        const confirmed = confirm('Automation is in progress. Are you sure you want to close?');
        if (!confirmed) return;
    }
    
    try {
        window.close();
    } catch (error) {
        console.log('Cannot close window programmatically:', error);
        // Fallback: redirect to about:blank
        window.location.href = 'about:blank';
    }
}

// Handle window focus to maintain connection
window.addEventListener('focus', function() {
    console.log('Extension window focused');
    if (port && !port.onMessage) {
        console.log('Window focused, reconnecting...');
        connectToBackground();
    }
});

// Keep window alive during automation
window.addEventListener('blur', function() {
    if (keepPopupOpen || isExecuting) {
        console.log('Window blurred but keeping alive for automation');
        // Try to bring window back to focus after a short delay
        setTimeout(() => {
            if (keepPopupOpen || isExecuting) {
                window.focus();
            }
        }, 100);
    }
});

// Prevent window from being minimized during automation
window.addEventListener('beforeunload', function(e) {
    if (keepPopupOpen || isExecuting) {
        e.preventDefault();
        e.returnValue = 'Automation in progress. Are you sure you want to close?';
        return e.returnValue;
    }
});

// Keep window visible during automation
setInterval(() => {
    if (keepPopupOpen || isExecuting) {
        if (document.hidden || document.visibilityState === 'hidden') {
            console.log('Window hidden, attempting to bring to front');
            window.focus();
            // Try to bring window to front
            window.blur();
            window.focus();
        }
        
        // Also try to keep window in focus
        if (document.hasFocus() === false) {
            window.focus();
        }
    }
}, 1000); // Check every second

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Social Shopping Agent popup loaded');
    
    // Establish connection to background script
    connectToBackground();
    
    // Add event listeners for chatbot card
    const chatbotCard = document.getElementById('chatbot-card');
    if (chatbotCard) {
        chatbotCard.addEventListener('click', openChat);
        console.log('Chatbot card click listener added');
    }
    
    // Add event listeners for back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', closeChat);
        console.log('Back button click listener added');
    }
    
    // Add event listeners for send button
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        console.log('Send button click listener added');
    }
    
    // Add event listeners for input field
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', handleKeyPress);
        console.log('Message input keypress listener added');
    }
    
    // Add event listeners for quick action buttons
    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', showHistory);
        console.log('History button click listener added');
    }
    
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', showSettings);
                console.log('Settings button click listener added');
            }
            
            // Add event listener for close window button
            const closeWindowBtn = document.getElementById('closeWindowBtn');
            if (closeWindowBtn) {
                closeWindowBtn.addEventListener('click', closeWindow);
                console.log('Close window button click listener added');
            }
    
    // Make functions globally available for debugging
    window.openChat = openChat;
    window.closeChat = closeChat;
    window.sendMessage = sendMessage;
    window.showHistory = showHistory;
    window.showSettings = showSettings;
    
    console.log('All event listeners attached successfully');
});