const fs = require('fs');

console.log('🔧 Adding URL-based review scraping functionality...');

// Read the current background.js file
let content = fs.readFileSync('public/background.js', 'utf8');

// Add URL detection to the task execution logic
const oldTaskDetection = `  async executeTaskExecution(task, port) {
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
    }`;

const newTaskDetection = `  async executeTaskExecution(task, port) {
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
    }`;

// Replace the old task detection
content = content.replace(oldTaskDetection, newTaskDetection);

// Add the review scraping task function
const reviewScrapingFunction = `
  async executeReviewScrapingTask(url, port) {
    try {
      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Opening Amazon product page...'
      });

      // Open the Amazon product page
      const tab = await chrome.tabs.create({ url: url });
      await this.delay(3000);

      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Loading product page...'
      });

      // Wait for page to load
      await chrome.tabs.update(tab.id, { active: true });
      await this.delay(2000);

      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Scraping customer reviews...'
      });

      // Scrape reviews from the page
      const reviews = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          const reviews = [];
          
          // Look for review elements
          const reviewSelectors = [
            '[data-hook="review"]',
            '.review',
            '[data-testid="review"]',
            '.a-section.review',
            '.cr-original-review'
          ];
          
          for (const selector of reviewSelectors) {
            const reviewElements = document.querySelectorAll(selector);
            reviewElements.forEach((review, index) => {
              try {
                // Extract review text
                const reviewText = review.querySelector('[data-hook="review-body"]')?.textContent?.trim() ||
                                 review.querySelector('.review-text')?.textContent?.trim() ||
                                 review.querySelector('[data-testid="review-text"]')?.textContent?.trim() ||
                                 review.textContent?.trim();
                
                // Extract rating
                const ratingElement = review.querySelector('[data-hook="review-star-rating"]') ||
                                    review.querySelector('.a-icon-star') ||
                                    review.querySelector('[data-testid="review-rating"]');
                const rating = ratingElement ? 
                  (ratingElement.textContent?.match(/(\d+(?:\.\d+)?)/)?.[1] || '0') : '0';
                
                // Extract reviewer name
                const reviewerName = review.querySelector('[data-hook="review-author"]')?.textContent?.trim() ||
                                   review.querySelector('.reviewer-name')?.textContent?.trim() ||
                                   'Anonymous';
                
                // Extract review title
                const reviewTitle = review.querySelector('[data-hook="review-title"]')?.textContent?.trim() ||
                                  review.querySelector('.review-title')?.textContent?.trim() ||
                                  '';
                
                if (reviewText && reviewText.length > 10) {
                  reviews.push({
                    text: reviewText,
                    rating: parseFloat(rating),
                    reviewer: reviewerName,
                    title: reviewTitle,
                    index: index
                  });
                }
              } catch (error) {
                console.log('Error parsing review:', error);
              }
            });
          }
          
          return reviews;
        }
      });

      const extractedReviews = reviews[0]?.result || [];
      
      this.safePostMessage(port, {
        type: 'status_update',
        message: \`Found \${extractedReviews.length} reviews\`
      });

      if (extractedReviews.length === 0) {
        this.safePostMessage(port, {
          type: 'status_update',
          message: 'No reviews found. Trying alternative selectors...'
        });

        // Try alternative scraping method
        const altReviews = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            const reviews = [];
            const allText = document.body.textContent;
            
            // Look for review patterns in text
            const reviewPatterns = [
              /(?:review|opinion|feedback)[\\s\\S]{20,500}(?:helpful|thumbs|like)/gi,
              /(?:bought|purchased|ordered)[\\s\\S]{20,500}(?:recommend|satisfied|happy)/gi
            ];
            
            reviewPatterns.forEach(pattern => {
              const matches = allText.match(pattern);
              if (matches) {
                matches.forEach((match, index) => {
                  if (match.length > 50) {
                    reviews.push({
                      text: match.trim(),
                      rating: 0,
                      reviewer: 'Extracted',
                      title: 'Review ' + (index + 1),
                      index: index
                    });
                  }
                });
              }
            });
            
            return reviews;
          }
        });

        const altExtractedReviews = altReviews[0]?.result || [];
        
        if (altExtractedReviews.length > 0) {
          this.safePostMessage(port, {
            type: 'status_update',
            message: \`Found \${altExtractedReviews.length} reviews using alternative method\`
          });
          
          // Process and display reviews
          await this.processAndDisplayReviews(altExtractedReviews, port);
        } else {
          this.safePostMessage(port, {
            type: 'task_error',
            error: 'No reviews found on this page. Please check if this is a valid Amazon product page with reviews.'
          });
        }
      } else {
        // Process and display reviews
        await this.processAndDisplayReviews(extractedReviews, port);
      }

    } catch (error) {
      this.safePostMessage(port, {
        type: 'task_error',
        error: 'Failed to scrape reviews: ' + error.message
      });
    }
  }

  async processAndDisplayReviews(reviews, port) {
    try {
      // Analyze reviews
      const positiveReviews = reviews.filter(review => review.rating >= 4);
      const negativeReviews = reviews.filter(review => review.rating <= 2);
      const neutralReviews = reviews.filter(review => review.rating === 3);
      
      this.safePostMessage(port, {
        type: 'status_update',
        message: \`Analyzing \${reviews.length} reviews...\`
      });

      // Create summary
      const summary = {
        total: reviews.length,
        positive: positiveReviews.length,
        negative: negativeReviews.length,
        neutral: neutralReviews.length,
        averageRating: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      };

      this.safePostMessage(port, {
        type: 'step_complete',
        message: \`Review Analysis Complete!\\n\\nTotal Reviews: \${summary.total}\\nPositive (4-5 stars): \${summary.positive}\\nNegative (1-2 stars): \${summary.negative}\\nNeutral (3 stars): \${summary.neutral}\\nAverage Rating: \${summary.averageRating.toFixed(1)}/5\`
      });

      // Show positive reviews
      if (positiveReviews.length > 0) {
        this.safePostMessage(port, {
          type: 'step_complete',
          message: \`\\n📈 TOP POSITIVE REVIEWS:\\n\\n\${positiveReviews.slice(0, 3).map((review, index) => 
            \`\${index + 1}. ⭐ \${review.rating}/5 - \${review.title}\\n   "\${review.text.substring(0, 200)}..."\\n   - \${review.reviewer}\\n\`
          ).join('\\n')}\`
        });
      }

      // Show negative reviews
      if (negativeReviews.length > 0) {
        this.safePostMessage(port, {
          type: 'step_complete',
          message: \`\\n📉 TOP NEGATIVE REVIEWS:\\n\\n\${negativeReviews.slice(0, 3).map((review, index) => 
            \`\${index + 1}. ⭐ \${review.rating}/5 - \${review.title}\\n   "\${review.text.substring(0, 200)}..."\\n   - \${review.reviewer}\\n\`
          ).join('\\n')}\`
        });
      }

      this.safePostMessage(port, {
        type: 'task_complete',
        result: {
          response: \`Successfully scraped and analyzed \${reviews.length} customer reviews from the Amazon product page!\`,
          isMarkdown: false
        }
      });

    } catch (error) {
      this.safePostMessage(port, {
        type: 'task_error',
        error: 'Failed to process reviews: ' + error.message
      });
    }
  }

  async openUrl(url, port) {
    try {
      this.safePostMessage(port, {
        type: 'status_update',
        message: 'Opening URL...'
      });

      const tab = await chrome.tabs.create({ url: url });
      await this.delay(2000);

      this.safePostMessage(port, {
        type: 'step_complete',
        message: \`Successfully opened: \${url}\`
      });

    } catch (error) {
      this.safePostMessage(port, {
        type: 'task_error',
        error: 'Failed to open URL: ' + error.message
      });
    }
  }`;

// Add the review scraping functions after the existing functions
content = content.replace(
  /async delay\(ms\) \{[\s\S]*?\n  \}/,
  `async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }${reviewScrapingFunction}`
);

// Write the updated content
fs.writeFileSync('public/background.js', content);

console.log('✅ URL-based review scraping functionality added!');
console.log('✅ Added Amazon URL detection');
console.log('✅ Added review scraping with multiple selectors');
console.log('✅ Added review analysis and sentiment');
console.log('✅ Added positive/negative review display');
console.log('✅ Ready to rebuild extension...');
