// Social Shopping Agent Popup Script
let isExecuting = false;
let currentTask = null;
let port = null;

// Function to establish connection to background script
function connectToBackground() {
    try {
        if (port) {
            port.disconnect();
        }
        
        port = chrome.runtime.connect({ name: 'popup-connection' });
        
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
        
        port.onDisconnect.addListener(() => {
            console.log('Background connection lost, attempting to reconnect...');
            port = null;
            // Try to reconnect after a short delay
            setTimeout(() => {
                if (!port) {
                    connectToBackground();
                }
            }, 1000);
        });
        
    } catch (error) {
        console.error('Failed to connect to background script:', error);
        addMessage('assistant', 'Connection error. Please try again.');
    }
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
    
    // Check if port is connected
    if (!port) {
        console.log('Port not connected, attempting to reconnect...');
        connectToBackground();
        // Wait a moment for connection to establish
        setTimeout(() => {
            if (port) {
                try {
                    port.postMessage({
                        type: 'new_task',
                        task: message
                    });
                } catch (error) {
                    console.error('Failed to send message:', error);
                    addMessage('assistant', 'Failed to send message. Please try again.');
                }
            } else {
                addMessage('assistant', 'Connection failed. Please try again.');
            }
        }, 1000);
    } else {
        try {
            port.postMessage({
                type: 'new_task',
                task: message
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            addMessage('assistant', 'Failed to send message. Please try again.');
            // Try to reconnect
            connectToBackground();
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
    
    // Make functions globally available for debugging
    window.openChat = openChat;
    window.closeChat = closeChat;
    window.sendMessage = sendMessage;
    window.showHistory = showHistory;
    window.showSettings = showSettings;
    
    console.log('All event listeners attached successfully');
});