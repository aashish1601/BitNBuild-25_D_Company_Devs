# Amazon Scraping Server

This server provides reliable Amazon product scraping for the Social Shopping Agent extension.

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **For development (with auto-restart):**
   ```bash
   npm run dev
   ```

## API Endpoints

### POST /api/scrape-amazon
Scrapes Amazon products for a given search term.

**Request:**
```json
{
  "searchTerm": "best shoes"
}
```

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "title": "Product Title",
      "price": "$29.99",
      "rating": "4.5 out of 5 stars",
      "reviewCount": "1,234 reviews",
      "image": "https://...",
      "link": "https://amazon.com/dp/...",
      "index": 0
    }
  ],
  "count": 5
}
```

### GET /health
Health check endpoint.

## Features

- ✅ **Puppeteer-based scraping** - Handles dynamic content
- ✅ **Anti-detection measures** - User agent spoofing
- ✅ **Error handling** - Graceful fallbacks
- ✅ **CORS enabled** - Works with browser extensions
- ✅ **Product limit** - Returns top 5 products
- ✅ **Clean data** - Structured product information

## Deployment

For production deployment:

1. **Environment variables:**
   ```bash
   export PORT=3001
   export NODE_ENV=production
   ```

2. **PM2 (recommended):**
   ```bash
   npm install -g pm2
   pm2 start scraper.js --name "amazon-scraper"
   ```

3. **Docker (optional):**
   ```dockerfile
   FROM node:16
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

## Troubleshooting

- **Port conflicts:** Change PORT in environment variables
- **Puppeteer issues:** Ensure Chrome/Chromium is installed
- **Memory issues:** Increase Node.js memory limit: `node --max-old-space-size=4096 scraper.js`
