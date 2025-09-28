const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Scraping endpoint
app.post('/api/scrape-amazon', async (req, res) => {
  try {
    const { searchTerm } = req.body;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    console.log(`Scraping Amazon for: ${searchTerm}`);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to Amazon search
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Wait for products to load
    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });
    
    // Extract product data
    const products = await page.evaluate(() => {
      const productElements = document.querySelectorAll('[data-component-type="s-search-result"]');
      const results = [];
      
      productElements.forEach((element, index) => {
        if (index < 5) { // Limit to 5 products
          try {
            const titleEl = element.querySelector('h2 a, h3 a');
            const priceEl = element.querySelector('.a-price-whole, .a-price .a-offscreen');
            const ratingEl = element.querySelector('.a-icon-alt, [aria-label*="stars"]');
            const reviewEl = element.querySelector('[aria-label*="stars"]');
            const imgEl = element.querySelector('img');
            
            const title = titleEl ? titleEl.textContent.trim() : 'No title';
            const price = priceEl ? priceEl.textContent.trim() : 'Price not available';
            const rating = ratingEl ? ratingEl.textContent.trim() : 'No rating';
            const reviews = reviewEl ? reviewEl.textContent.trim() : 'No reviews';
            const image = imgEl ? imgEl.src : '';
            const link = titleEl ? titleEl.href : '';
            
            if (title && title !== 'No title' && link) {
              results.push({
                title: title.substring(0, 100) + (title.length > 100 ? '...' : ''),
                price: price,
                rating: rating,
                reviewCount: reviews,
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
      
      return results;
    });
    
    await browser.close();
    
    res.json({
      success: true,
      products: products,
      count: products.length
    });
    
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape products',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Scraping server running on port ${PORT}`);
});

module.exports = app;
