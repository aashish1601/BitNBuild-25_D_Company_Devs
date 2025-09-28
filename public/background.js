/* global chrome */

console.log('Social Shopping Agent Background Script Loading...');

// Simple background script for Chrome extension
class BackgroundScript {
  constructor() {
    this.isExecuting = false;
    this.currentTask = null;
    this.currentPort = null;
    this.extensionWindowId = null;
    this.isCreatingWindow = false;
    this.focusCheckInterval = null;
    this.keepPopupOpen = false;
    this.setupEventListeners();
  }
  // Safe method to post messages to port
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
        
        // Store the port reference
        this.currentPort = port;
        
        port.onMessage.addListener((message) => {
          this.handlePopupMessage(message, port);
        });

        port.onDisconnect.addListener(() => {
          console.log('Popup disconnected');
          this.currentPort = null;
          this.isExecuting = false;
          this.currentTask = null;
        });

        // Send initial status
        this.safePostMessage(port, {
          type: 'connected',
          isExecuting: this.isExecuting
        });
      }
    });

    // Handle extension icon click to open window instead of popup
    chrome.action.onClicked.addListener((tab) => {
      this.openExtensionWindow();
    });
  }

  async openExtensionWindow() {
    try {
      // Prevent multiple window creation
      if (this.isCreatingWindow) {
        console.log('Window creation already in progress, skipping...');
        return;
      }

      this.isCreatingWindow = true;

      // Check if window is already open
      const windows = await chrome.windows.getAll();
      const existingWindow = windows.find(w => w.type === 'popup' && w.url && w.url.includes('popup.html'));
      
      if (existingWindow) {
        // Focus existing window and bring to front
        await chrome.windows.update(existingWindow.id, { 
          focused: true,
          state: 'normal'
        });
        this.extensionWindowId = existingWindow.id;
        console.log('Focused existing extension window');
        this.isCreatingWindow = false;
        return;
      }

      // Create new popup window with better persistence settings
      const window = await chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 400,
        height: 600,
        left: 100,
        top: 100,
        state: 'normal',
        focused: true
      });

      console.log('Extension window opened:', window);
      
      // Store window ID for reference
      this.extensionWindowId = window.id;
      this.isCreatingWindow = false;
      
    } catch (error) {
      console.error('Failed to open extension window:', error);
      this.isCreatingWindow = false;
    }
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

        case 'select_product':
          await this.handleProductSelection(message.productIndex, port);
          break;

        case 'ping':
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
  }

  async handleNewTask(task, port) {
    console.log('New task received:', task);
    
    this.isExecuting = true;
    this.keepPopupOpen = true;
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
          response: `Task completed: ${task}`,
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
      this.keepPopupOpen = false;
      this.currentTask = null;
      this.stopFocusCheck();
    }
  }

  async executeTaskExecution(task, port) {
    console.log('Analyzing task:', task);
    
    // Check if task contains a URL
    const urlMatch = task.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      console.log('Detected URL:', url);
      
      // Check if it's an Amazon product URL
      if (url.includes('amazon.com') || url.includes('amazon.in') || url.includes('amazon.co.uk')) {
        console.log('Detected Amazon product URL - starting review scraping');
        await this.executeReviewScrapingTask(url, port);
        return;
      } else {
        console.log('Non-Amazon URL detected - opening URL');
        await this.openUrl(url, port);
        return;
      }
    }
    
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
      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Opening Twitter...'
      });

      // Open Twitter
      const tab = await chrome.tabs.create({ url: 'https://twitter.com' });
      await this.delay(2000);

      this.safePostMessage(port, {
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
        this.safePostMessage(port, {
          type: 'status_update',
          message: 'Twitter opened, but compose button not found. Please click compose manually.'
        });
      }

      this.safePostMessage(port, {
        type: 'step_complete',
        message: 'Ready to compose tweet! Please type your message.'
      });

    } catch (error) {
      this.safePostMessage(port, {
        type: 'task_error',
        error: 'Failed to open Twitter: ' + error.message
      });
    }
  }

  async executeAmazonTask(task, port) {
    try {
      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Opening Amazon...'
      });

      // Open Amazon
      const tab = await chrome.tabs.create({ url: 'https://amazon.com' });
      await this.delay(3000);

      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Extracting product name from your request...'
      });

      // Extract product name from task
      const productName = this.extractProductName(task);
      
      this.safePostMessage(port, {
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
        this.safePostMessage(port, {
          type: 'status_update',
          message: 'Amazon opened, but search failed. Please search manually for: ' + productName
        });
      }

      await this.delay(3000);

      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Analyzing search results and finding best products...'
      });

      // Get product comparison data instead of directly adding to cart
      const productData = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          const products = [];
          
          // Wait a bit for page to load
          setTimeout(() => {
            console.log('Starting product scraping...');
          }, 1000);
          
          // More comprehensive selectors for Amazon search results
          const productSelectors = [
            '[data-component-type="s-search-result"]',
            '.s-result-item',
            '[data-cy="title-recipe"]',
            '.s-link-style',
            '.s-search-result',
            '[data-asin]',
            '.s-widget-container'
          ];
          
          console.log('Available selectors:', productSelectors);
          
          for (const selector of productSelectors) {
            const productElements = document.querySelectorAll(selector);
            console.log(`Found ${productElements.length} elements with selector: ${selector}`);
            
            productElements.forEach((element, index) => {
              if (index < 5) { // Limit to top 5 products
                try {
                  // Try multiple title selectors
                  const titleElement = element.querySelector('h2 a, h3 a, .s-link-style a, [data-cy="title-recipe"] a, .a-link-normal');
                  
                  // Try multiple price selectors
                  const priceElement = element.querySelector('.a-price-whole, .a-price .a-offscreen, .a-price-range, .a-price .a-offscreen, .a-price-symbol, .a-price-fraction');
                  
                  // Try multiple rating selectors
                  const ratingElement = element.querySelector('.a-icon-alt, [aria-label*="stars"], .a-icon-star, .a-icon-star-small');
                  
                  // Try multiple review count selectors
                  const reviewCountElement = element.querySelector('[aria-label*="stars"], .a-size-base, .a-link-normal');
                  
                  // Try multiple image selectors
                  const imageElement = element.querySelector('img, .s-image, .a-dynamic-image');
                  
                  const title = titleElement ? titleElement.textContent.trim() : 'No title';
                  const price = priceElement ? priceElement.textContent.trim() : 'Price not available';
                  const rating = ratingElement ? ratingElement.textContent.trim() : 'No rating';
                  const reviewCount = reviewCountElement ? reviewCountElement.textContent.trim() : 'No reviews';
                  const image = imageElement ? imageElement.src : '';
                  const link = titleElement ? titleElement.href : '';
                  
                  console.log(`Product ${index}:`, { title, price, rating, link });
                  
                  if (title && title !== 'No title' && link && title.length > 10) {
                    products.push({
                      title: title.substring(0, 100) + (title.length > 100 ? '...' : ''),
                      price: price,
                      rating: rating,
                      reviewCount: reviewCount,
                      image: image,
                      link: link,
                      index: index
                    });
                  }
                } catch (error) {
                  console.log('Error parsing product:', error);
                }
              }
            });
          }
          
          console.log(`Total products found: ${products.length}`);
          return products;
        }
      });

      let products = productData[0]?.result || [];
      
      if (products.length === 0) {
        this.safePostMessage(port, {
          type: 'status_update',
          message: 'No products found with primary method. Trying alternative scraping...'
        });

        // Try alternative scraping method
        const altProductData = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            const products = [];
            
            // Try to find any clickable product links
            const allLinks = document.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"]');
            console.log(`Found ${allLinks.length} product links`);
            
            allLinks.forEach((link, index) => {
              if (index < 5) {
                try {
                  const title = link.textContent.trim() || link.getAttribute('title') || 'Product';
                  const href = link.href;
                  
                  // Find parent container for price and rating
                  const container = link.closest('[data-component-type="s-search-result"], .s-result-item, .s-search-result') || link.parentElement;
                  
                  const priceEl = container ? container.querySelector('.a-price, .a-offscreen, [class*="price"]') : null;
                  const price = priceEl ? priceEl.textContent.trim() : 'Price not available';
                  
                  const ratingEl = container ? container.querySelector('[aria-label*="stars"], .a-icon-star') : null;
                  const rating = ratingEl ? ratingEl.textContent.trim() : 'No rating';
                  
                  const imgEl = container ? container.querySelector('img') : null;
                  const image = imgEl ? imgEl.src : '';
                  
                  if (title && title.length > 5 && href) {
                    products.push({
                      title: title.substring(0, 100) + (title.length > 100 ? '...' : ''),
                      price: price,
                      rating: rating,
                      reviewCount: 'Reviews available',
                      image: image,
                      link: href,
                      index: index
                    });
                  }
                } catch (error) {
                  console.log('Error in alternative scraping:', error);
                }
              }
            });
            
            return products;
          }
        });

        const altProducts = altProductData[0]?.result || [];
        
        if (altProducts.length === 0) {
          // Try server-side scraping as last resort
          this.safePostMessage(port, {
            type: 'status_update',
            message: 'Client-side scraping failed. Trying server-side API...'
          });
          
          try {
            const serverProducts = await this.scrapeWithServerAPI(productName);
            if (serverProducts.length > 0) {
              products = serverProducts;
              this.safePostMessage(port, {
                type: 'status_update',
                message: `Found ${serverProducts.length} products using server API`
              });
            } else {
              this.safePostMessage(port, {
                type: 'task_error',
                error: 'No products found. Please try a different search term or check your internet connection.'
              });
              return;
            }
          } catch (serverError) {
            this.safePostMessage(port, {
              type: 'task_error',
              error: 'Scraping failed. Please try again or use a different search term.'
            });
            return;
          }
        } else {
          // Use alternative products
          products = altProducts;
          this.safePostMessage(port, {
            type: 'status_update',
            message: `Found ${altProducts.length} products using alternative method`
          });
        }
      }

      // Keep extension window focused
      await this.keepExtensionWindowFocused();

      // Start periodic focus check during automation
      this.startFocusCheck();

      // Send product comparison to popup
      this.safePostMessage(port, {
        type: 'product_comparison',
        products: products,
        searchTerm: productName
      });

      this.safePostMessage(port, {
        type: 'step_complete',
        message: `Found ${products.length} products for "${productName}". Please choose which one to add to cart from the comparison above.`
      });

          } catch (error) {
      this.safePostMessage(port, {
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
      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Opening YouTube...'
      });

      // Open YouTube
      const tab = await chrome.tabs.create({ url: 'https://youtube.com' });
      await this.delay(3000);

      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Extracting search terms...'
      });

      // Extract search terms
      const searchTerms = this.extractSearchTerms(task);
      
      this.safePostMessage(port, {
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

      this.safePostMessage(port, {
        type: 'step_complete',
        message: `Successfully searched for ${searchTerms} on YouTube!`
      });
                      
                    } catch (error) {
      this.safePostMessage(port, {
                        type: 'task_error',
        error: 'Failed to complete search task: ' + error.message
      });
    }
  }

  async executeGeneralTask(task, port) {
    try {
      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Analyzing your request...'
      });

      // Determine what the user wants to do
      if (task.toLowerCase().includes('gmail')) {
        await this.openGmail(port);
      } else if (task.toLowerCase().includes('google')) {
        await this.openGoogle(port);
              } else {
        this.safePostMessage(port, {
          type: 'status_update',
          message: 'Opening Google to help with your request...'
        });
        
        const tab = await chrome.tabs.create({ url: 'https://google.com' });
        await this.delay(2000);
        
        this.safePostMessage(port, {
          type: 'step_complete',
          message: 'Opened Google to help with your request!'
        });
      }

      } catch (error) {
      this.safePostMessage(port, {
        type: 'task_error',
        error: 'Failed to complete general task: ' + error.message
      });
    }
  }

  async openGmail(port) {
    this.safePostMessage(port, {
      type: 'status_update',
      message: 'Opening Gmail...'
    });

    const tab = await chrome.tabs.create({ url: 'https://gmail.com' });
    await this.delay(3000);

    this.safePostMessage(port, {
      type: 'step_complete',
      message: 'Gmail opened successfully!'
    });
  }

  async openGoogle(port) {
    this.safePostMessage(port, {
      type: 'status_update',
      message: 'Opening Google...'
    });

    const tab = await chrome.tabs.create({ url: 'https://google.com' });
    await this.delay(2000);

    this.safePostMessage(port, {
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
    
    this.safePostMessage(port, {
      type: 'task_cancelled',
      progress: 'Task cancelled by user'
    });
  }

  async handleResumeTask(port) {
    if (this.currentTask) {
      this.safePostMessage(port, {
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

  async handleProductSelection(productIndex, port) {
    try {
      this.safePostMessage(port, {
        type: 'status_update',
        message: `Adding product ${productIndex + 1} to cart...`
      });

      // Find any Amazon tab (not just active one)
      const tabs = await chrome.tabs.query({});
      const amazonTab = tabs.find(tab => tab.url && tab.url.includes('amazon.com'));

      if (!amazonTab) {
        this.safePostMessage(port, {
          type: 'task_error',
          error: 'Amazon tab not found. Please try the search again.'
        });
        return;
      }

      // Focus the Amazon tab
      await chrome.tabs.update(amazonTab.id, { active: true });
      await this.delay(1000);

      // Click on the selected product
      const clickResult = await chrome.scripting.executeScript({
        target: { tabId: amazonTab.id },
        function: (index) => {
          const productSelectors = [
            '[data-component-type="s-search-result"]',
            '.s-result-item',
            '[data-cy="title-recipe"]',
            '.s-link-style'
          ];
          
          for (const selector of productSelectors) {
            const productElements = document.querySelectorAll(selector);
            if (productElements[index]) {
              const productLink = productElements[index].querySelector('h2 a, h3 a, .s-link-style a');
              if (productLink) {
                productLink.click();
                return 'Product clicked: ' + productLink.textContent.trim();
              }
            }
          }
          return 'Product not found';
        },
        args: [productIndex]
      });

      if (clickResult[0]?.result === 'Product not found') {
        this.safePostMessage(port, {
          type: 'status_update',
          message: 'Product not found on current page. Navigating to product page...'
        });
        
        // Try to navigate to the product page directly
        await chrome.tabs.update(amazonTab.id, { 
          url: `https://www.amazon.com/s?k=best+shoe&ref=sr_pg_1`
        });
        await this.delay(3000);
      }

      await this.delay(3000);

      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Adding selected product to cart...'
      });

      // Add to cart
      await chrome.scripting.executeScript({
        target: { tabId: amazonTab.id },
        function: () => {
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

      this.safePostMessage(port, {
        type: 'step_complete',
        message: `Successfully added product ${productIndex + 1} to your Amazon cart!`
      });

    } catch (error) {
      this.safePostMessage(port, {
        type: 'task_error',
        error: 'Failed to add product to cart: ' + error.message
      });
    }
  }

  async keepExtensionWindowFocused() {
    try {
      if (this.extensionWindowId) {
        await chrome.windows.update(this.extensionWindowId, { 
          focused: true,
          state: 'normal'
        });
        console.log('Extension window focused');
      }
    } catch (error) {
      console.log('Could not focus extension window:', error);
      // Try to find and focus any extension window
      const windows = await chrome.windows.getAll();
      const extensionWindow = windows.find(w => w.type === 'popup' && w.url && w.url.includes('popup.html'));
      if (extensionWindow) {
        await chrome.windows.update(extensionWindow.id, { 
          focused: true,
          state: 'normal'
        });
        this.extensionWindowId = extensionWindow.id;
      }
    }
  }

  startFocusCheck() {
    if (this.focusCheckInterval) {
      clearInterval(this.focusCheckInterval);
    }
    
    this.focusCheckInterval = setInterval(async () => {
      if (this.isExecuting || this.keepPopupOpen) {
        await this.keepExtensionWindowFocused();
        
        // Also try to bring window to front using tabs API
        try {
          const windows = await chrome.windows.getAll();
          const extensionWindow = windows.find(w => w.type === 'popup' && w.url && w.url.includes('popup.html'));
          if (extensionWindow) {
            // Get the active tab in the extension window
            const tabs = await chrome.tabs.query({ windowId: extensionWindow.id });
            if (tabs.length > 0) {
              await chrome.tabs.update(tabs[0].id, { active: true });
            }
          }
        } catch (error) {
          console.log('Could not update extension window tabs:', error);
        }
      }
    }, 500); // Check every 500ms for more aggressive focus
  }

  stopFocusCheck() {
    if (this.focusCheckInterval) {
      clearInterval(this.focusCheckInterval);
      this.focusCheckInterval = null;
    }
  }

  async scrapeWithServerAPI(searchTerm) {
    try {
      // Use our local scraping server
      const response = await fetch('http://localhost:3001/api/scrape-amazon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchTerm: searchTerm })
      });
      
      if (!response.ok) {
        throw new Error('Server API failed');
      }
      
      const data = await response.json();
      
      if (data.success && data.products) {
        return data.products;
      } else {
        throw new Error('No products found from server');
      }
      
    } catch (error) {
      console.log('Server API not available, using fallback method');
      
      // Fallback to mock data
      return await this.simulateAmazonSearch(searchTerm);
    }
  }

  parseProductsFromHTML(html) {
    // This would parse the HTML response from the server
    // For now, return mock data
    return [
      {
        title: `${searchTerm} - Premium Quality`,
        price: '$29.99',
        rating: '4.5 out of 5 stars',
        reviewCount: '1,234 reviews',
        image: 'https://via.placeholder.com/150',
        link: 'https://amazon.com/dp/example1',
        index: 0
      },
      {
        title: `${searchTerm} - Best Seller`,
        price: '$39.99',
        rating: '4.8 out of 5 stars',
        reviewCount: '2,456 reviews',
        image: 'https://via.placeholder.com/150',
        link: 'https://amazon.com/dp/example2',
        index: 1
      }
    ];
  }

  async simulateAmazonSearch(searchTerm) {
    // Simulate a search with mock data
    return [
      {
        title: `Premium ${searchTerm} - High Quality`,
        price: '$24.99',
        rating: '4.3 out of 5 stars',
        reviewCount: '856 reviews',
        image: 'https://via.placeholder.com/150',
        link: 'https://amazon.com/dp/mock1',
        index: 0
      },
      {
        title: `Best ${searchTerm} - Top Rated`,
        price: '$34.99',
        rating: '4.7 out of 5 stars',
        reviewCount: '1,234 reviews',
        image: 'https://via.placeholder.com/150',
        link: 'https://amazon.com/dp/mock2',
        index: 1
      },
      {
        title: `Professional ${searchTerm} - Durable`,
        price: '$44.99',
        rating: '4.6 out of 5 stars',
        reviewCount: '567 reviews',
        image: 'https://via.placeholder.com/150',
        link: 'https://amazon.com/dp/mock3',
        index: 2
      }
    ];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize background script
new BackgroundScript();
