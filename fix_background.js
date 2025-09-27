const fs = require('fs');

console.log('🔧 Fixing task detection logic in background.js...');

// Read the current background.js file
let content = fs.readFileSync('public/background.js', 'utf8');

// Replace the old task detection with improved logic
const oldLogic = `  async executeTaskExecution(task, port) {
    // Perform real web automation based on task type
    if (task.toLowerCase().includes('twitter') || task.toLowerCase().includes('post')) {
      await this.executeSocialMediaTask(task, port);
    } else if (task.toLowerCase().includes('amazon') || task.toLowerCase().includes('cart')) {
      await this.executeAmazonTask(task, port);
    } else if (task.toLowerCase().includes('youtube') || task.toLowerCase().includes('search')) {
      await this.executeSearchTask(task, port);
    } else {
      await this.executeGeneralTask(task, port);
    }
  }`;

const newLogic = `  async executeTaskExecution(task, port) {
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
  }`;

// Replace the old logic
content = content.replace(oldLogic, newLogic);

// Also improve the extractProductName function
const oldExtract = `  extractProductName(task) {
    // Extract product name from various task formats
    const patterns = [
      /find\\s+(.+?)\\s+on\\s+amazon/i,
      /search\\s+for\\s+(.+?)\\s+on\\s+amazon/i,
      /add\\s+(.+?)\\s+to\\s+cart/i,
      /buy\\s+(.+?)\\s+from\\s+amazon/i,
      /amazon.*?(\\w+.*?)(?:\\s+and|\\s+to|\\s+on|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = task.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback: extract words after common keywords
    const keywords = ['find', 'search', 'buy', 'add', 'get'];
    for (const keyword of keywords) {
      const index = task.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const afterKeyword = task.substring(index + keyword.length).trim();
        const words = afterKeyword.split(/\\s+/).slice(0, 5); // Take first 5 words
        return words.join(' ');
      }
    }
    
    return 'product'; // Default fallback
  }`;

const newExtract = `  extractProductName(task) {
    // Extract product name from various task formats
    const patterns = [
      /find\\s+(.+?)\\s+on\\s+amazon/i,
      /search\\s+for\\s+(.+?)\\s+on\\s+amazon/i,
      /add\\s+(.+?)\\s+to\\s+cart/i,
      /buy\\s+(.+?)\\s+from\\s+amazon/i,
      /amazon.*?(\\w+.*?)(?:\\s+and|\\s+to|\\s+on|$)/i,
      /buy\\s+(.+)/i,
      /get\\s+(.+)/i,
      /purchase\\s+(.+)/i
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
        const words = afterKeyword.split(/\\s+/).slice(0, 5); // Take first 5 words
        return words.join(' ');
      }
    }
    
    return 'product'; // Default fallback
  }`;

// Replace the old extract function
content = content.replace(oldExtract, newExtract);

// Write the updated content
fs.writeFileSync('public/background.js', content);

console.log('✅ Task detection logic improved!');
console.log('✅ Now detects: buy, purchase, iPhone, laptop, headphones, etc.');
console.log('✅ Better product name extraction for Amazon tasks');
console.log('✅ Ready to rebuild extension...');
