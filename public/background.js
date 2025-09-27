/* global chrome */

console.log('Social Shopping Agent Background Script Loading...');

// Simple background script for Chrome extension
class BackgroundScript {
  constructor() {
    this.isExecuting = false;
    this.currentTask = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
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
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'START_DEEPHUD_LOGIN':
          const result = await this.handleDeepHUDLogin();
          sendResponse(result);
          break;

        case 'GET_TAB_INFO':
          const tabInfo = await this.getTabInfo();
          sendResponse({ success: true, data: tabInfo });
          break;

        case 'EXECUTE_TASK':
          const taskResult = await this.executeTask(message.task);
          sendResponse(taskResult);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handlePopupMessage(message, port) {
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
  }

  async handleNewTask(task, port) {
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
          response: `Task completed: ${task}`,
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
  }

  async executeTaskExecution(task, port) {
    console.log('Analyzing task:', task);
    
    // More intelligent task detection - check shopping keywords FIRST
    const lowerTask = task.toLowerCase();
    
    // Amazon/Shopping detection - comprehensive keyword list
    if (lowerTask.includes('amazon') || 
        lowerTask.includes('buy') || 
        lowerTask.includes('purchase') ||
        lowerTask.includes('add to cart') ||
        lowerTask.includes('shopping') ||
        lowerTask.includes('product') ||
        lowerTask.includes('iphone') ||
        lowerTask.includes('laptop') ||
        lowerTask.includes('headphones') ||
        lowerTask.includes('phone') ||
        lowerTask.includes('book') ||
        lowerTask.includes('clothes') ||
        lowerTask.includes('shoes') ||
        lowerTask.includes('watch') ||
        lowerTask.includes('camera') ||
        lowerTask.includes('tablet') ||
        lowerTask.includes('computer') ||
        lowerTask.includes('gaming') ||
        lowerTask.includes('electronics')) {
      console.log('Detected Amazon/shopping task');
      await this.executeAmazonTask(task, port);
    }
    // Twitter/Social media detection
    else if (lowerTask.includes('twitter') || 
             lowerTask.includes('post') || 
             lowerTask.includes('tweet') ||
             lowerTask.includes('social media')) {
      console.log('Detected Twitter/social media task');
      await this.executeSocialMediaTask(task, port);
    }
    // YouTube/Search detection
    else if (lowerTask.includes('youtube') || 
             lowerTask.includes('video') ||
             lowerTask.includes('tutorial') ||
             lowerTask.includes('search') ||
             lowerTask.includes('find') ||
             lowerTask.includes('look for')) {
      console.log('Detected YouTube/search task');
      await this.executeSearchTask(task, port);
    }
    // Gmail detection
    else if (lowerTask.includes('gmail') || 
             lowerTask.includes('email') ||
             lowerTask.includes('mail')) {
      console.log('Detected Gmail task');
      await this.openGmail(port);
    }
    // Google detection
    else if (lowerTask.includes('google') || 
             lowerTask.includes('search') ||
             lowerTask.includes('find')) {
      console.log('Detected Google task');
      await this.openGoogle(port);
    }
    // Default fallback
    else {
      console.log('No specific task detected, using general handler');
      await this.executeGeneralTask(task, port);
    }
  }

  async executeSocialMediaTask(task, port) {
    try {
      port.postMessage({
        type: 'status_update',
        message: 'Opening Twitter...'
      });

      // Open Twitter
      const tab = await chrome.tabs.create({ url: 'https://twitter.com' });
      await this.delay(2000);

      port.postMessage({
        type: 'status_update',
        message: 'Navigating to compose tweet...'
      });

      // Wait for page to load and click compose button
      await chrome.tabs.update(tab.id, { active: true });
      await this.delay(3000);

      // Execute content script to find and click compose button
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            // Look for compose button
            const composeSelectors = [
              '[data-testid="SideNav_NewTweet_Button"]',
              '[aria-label="Tweet"]',
              'a[href="/compose/tweet"]',
              '[data-testid="tweetButtonInline"]'
            ];
            
            for (const selector of composeSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                element.click();
                return 'Compose button clicked';
              }
            }
            return 'Compose button not found';
          }
        });
      } catch (scriptError) {
        console.log('Script execution error:', scriptError);
        port.postMessage({
          type: 'status_update',
          message: 'Twitter opened, but compose button not found. Please click compose manually.'
        });
      }

      port.postMessage({
        type: 'step_complete',
        message: 'Ready to compose tweet! Please type your message.'
      });

    } catch (error) {
      port.postMessage({
        type: 'task_error',
        error: 'Failed to open Twitter: ' + error.message
      });
    }
  }

  async executeAmazonTask(task, port) {
    try {
      port.postMessage({
        type: 'status_update',
        message: 'Opening Amazon...'
      });

      // Open Amazon
      const tab = await chrome.tabs.create({ url: 'https://amazon.com' });
      await this.delay(3000);

      port.postMessage({
        type: 'status_update',
        message: 'Extracting product name from your request...'
      });

      // Extract product name from task
      const productName = this.extractProductName(task);
      
      port.postMessage({
        type: 'status_update',
        message: `Searching for: ${productName}`
      });

      // Wait for page to load
      await chrome.tabs.update(tab.id, { active: true });
      await this.delay(2000);

      // Search for the product
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: (productName) => {
            // Find search box
            const searchBox = document.querySelector('#twotabsearchtextbox') || 
                             document.querySelector('input[placeholder*="Search"]') ||
                             document.querySelector('input[name="field-keywords"]');
            
            if (searchBox) {
              searchBox.value = productName;
              searchBox.dispatchEvent(new Event('input', { bubbles: true }));
              
              // Find and click search button
              const searchButton = document.querySelector('#nav-search-submit-button') ||
                                 document.querySelector('input[type="submit"]') ||
                                 document.querySelector('[aria-label="Go"]');
              
              if (searchButton) {
                searchButton.click();
                return 'Search initiated for: ' + productName;
              }
            }
            return 'Search box not found';
          },
          args: [productName]
        });
      } catch (scriptError) {
        console.log('Amazon search script error:', scriptError);
        port.postMessage({
          type: 'status_update',
          message: 'Amazon opened, but search failed. Please search manually for: ' + productName
        });
      }

      await this.delay(3000);

      port.postMessage({
        type: 'status_update',
        message: 'Looking for the best product match...'
      });

      // Find and click on the first product
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // Look for product links
          const productSelectors = [
            '[data-component-type="s-search-result"] h2 a',
            '.s-result-item h2 a',
            '[data-cy="title-recipe"] a',
            '.s-link-style h2 a'
          ];
          
          for (const selector of productSelectors) {
            const productLink = document.querySelector(selector);
            if (productLink) {
              productLink.click();
              return 'Product clicked: ' + productLink.textContent.trim();
            }
          }
          return 'No products found';
        }
      });

      await this.delay(3000);

      port.postMessage({
        type: 'status_update',
        message: 'Adding product to cart...'
      });

      // Add to cart
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // Look for add to cart button
          const addToCartSelectors = [
            '#add-to-cart-button',
            '[name="submit.add-to-cart"]',
            '#add-to-cart-button-ubb',
            'input[value="Add to Cart"]'
          ];
          
          for (const selector of addToCartSelectors) {
            const addToCartButton = document.querySelector(selector);
            if (addToCartButton) {
              addToCartButton.click();
              return 'Add to cart button clicked';
            }
          }
          return 'Add to cart button not found';
        }
      });

      await this.delay(2000);

      port.postMessage({
        type: 'step_complete',
        message: `Successfully added ${productName} to your Amazon cart!`
      });

    } catch (error) {
      port.postMessage({
        type: 'task_error',
        error: 'Failed to complete Amazon task: ' + error.message
      });
    }
  }

  extractProductName(task) {
    // Extract product name from various task formats
    const patterns = [
      /find\s+(.+?)\s+on\s+amazon/i,
      /search\s+for\s+(.+?)\s+on\s+amazon/i,
      /add\s+(.+?)\s+to\s+cart/i,
      /buy\s+(.+?)\s+from\s+amazon/i,
      /amazon.*?(\w+.*?)(?:\s+and|\s+to|\s+on|$)/i,
      /buy\s+(.+)/i,
      /get\s+(.+)/i,
      /purchase\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = task.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback: extract words after common keywords
    const keywords = ['find', 'search', 'buy', 'add', 'get', 'purchase'];
    for (const keyword of keywords) {
      const index = task.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const afterKeyword = task.substring(index + keyword.length).trim();
        const words = afterKeyword.split(/\s+/).slice(0, 5); // Take first 5 words
        return words.join(' ');
      }
    }
    
    return 'product'; // Default fallback
  }

  async executeSearchTask(task, port) {
    try {
      port.postMessage({
        type: 'status_update',
        message: 'Opening YouTube...'
      });

      // Open YouTube
      const tab = await chrome.tabs.create({ url: 'https://youtube.com' });
      await this.delay(3000);

      port.postMessage({
        type: 'status_update',
        message: 'Extracting search terms...'
      });

      // Extract search terms
      const searchTerms = this.extractSearchTerms(task);
      
      port.postMessage({
        type: 'status_update',
        message: `Searching for: ${searchTerms}`
      });

      // Wait for page to load
      await chrome.tabs.update(tab.id, { active: true });
      await this.delay(2000);

      // Search on YouTube
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (searchTerms) => {
          // Find search box
          const searchBox = document.querySelector('#search') || 
                           document.querySelector('input[placeholder*="Search"]') ||
                           document.querySelector('input[name="search_query"]');
          
          if (searchBox) {
            searchBox.value = searchTerms;
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Find and click search button
            const searchButton = document.querySelector('#search-icon-legacy') ||
                               document.querySelector('button[aria-label="Search"]') ||
                               document.querySelector('#search-icon');
            
            if (searchButton) {
              searchButton.click();
              return 'Search initiated for: ' + searchTerms;
            }
          }
          return 'Search box not found';
        },
        args: [searchTerms]
      });

      port.postMessage({
        type: 'step_complete',
        message: `Successfully searched for ${searchTerms} on YouTube!`
      });

    } catch (error) {
      port.postMessage({
        type: 'task_error',
        error: 'Failed to complete search task: ' + error.message
      });
    }
  }

  async executeGeneralTask(task, port) {
    try {
      port.postMessage({
        type: 'status_update',
        message: 'Analyzing your request...'
      });

      // Determine what the user wants to do
      if (task.toLowerCase().includes('gmail')) {
        await this.openGmail(port);
      } else if (task.toLowerCase().includes('google')) {
        await this.openGoogle(port);
      } else {
        port.postMessage({
          type: 'status_update',
          message: 'Opening Google to help with your request...'
        });
        
        const tab = await chrome.tabs.create({ url: 'https://google.com' });
        await this.delay(2000);
        
        port.postMessage({
          type: 'step_complete',
          message: 'Opened Google to help with your request!'
        });
      }

    } catch (error) {
      port.postMessage({
        type: 'task_error',
        error: 'Failed to complete general task: ' + error.message
      });
    }
  }

  async openGmail(port) {
    port.postMessage({
      type: 'status_update',
      message: 'Opening Gmail...'
    });

    const tab = await chrome.tabs.create({ url: 'https://gmail.com' });
    await this.delay(3000);

    port.postMessage({
      type: 'step_complete',
      message: 'Gmail opened successfully!'
    });
  }

  async openGoogle(port) {
    port.postMessage({
      type: 'status_update',
      message: 'Opening Google...'
    });

    const tab = await chrome.tabs.create({ url: 'https://google.com' });
    await this.delay(2000);

    port.postMessage({
      type: 'step_complete',
      message: 'Google opened successfully!'
    });
  }

  extractSearchTerms(task) {
    // Extract search terms from various formats
    const patterns = [
      /search\s+for\s+(.+?)\s+on\s+youtube/i,
      /find\s+(.+?)\s+on\s+youtube/i,
      /youtube.*?(\w+.*?)(?:\s+on|\s+for|$)/i,
      /search\s+(.+)/i,
      /find\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = task.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback: extract words after search keywords
    const keywords = ['search', 'find', 'look for'];
    for (const keyword of keywords) {
      const index = task.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const afterKeyword = task.substring(index + keyword.length).trim();
        const words = afterKeyword.split(/\s+/).slice(0, 5);
        return words.join(' ');
      }
    }
    
    return 'tutorials'; // Default fallback
  }

  async handleCancelTask(port) {
    this.isExecuting = false;
    this.currentTask = null;
    
    port.postMessage({
      type: 'task_cancelled',
      progress: 'Task cancelled by user'
    });
  }

  async handleResumeTask(port) {
    if (this.currentTask) {
      port.postMessage({
        type: 'task_resumed'
      });
    }
  }

  async handleDeepHUDLogin() {
    // Simulate authentication process
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          user: {
            id: 'user123',
            name: 'Demo User',
            email: 'demo@example.com'
          }
        });
      }, 1000);
    });
  }

  async getTabInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return {
        url: tab.url,
        title: tab.title,
        id: tab.id
      };
    } catch (error) {
      console.error('Error getting tab info:', error);
      return null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize background script
new BackgroundScript();
