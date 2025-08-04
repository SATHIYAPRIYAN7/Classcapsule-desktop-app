# Configuration

## API Configuration

The application uses centralized configuration for API endpoints. This makes it easy to switch between different environments.

### Files

1. **`config.js`** - Main process configuration (Node.js)
2. **`renderer-config.js`** - Renderer process configuration (Browser)

### Current Configuration

```javascript
// config.js
const config = {
  API_BASE_URL: 'https://api-dev-classcapsule.nfndev.com',
  NODE_ENV: 'development'
};
```

### How to Change API Domain

To change the API domain, update the `API_BASE_URL` in both:

1. **`config.js`** (for main process)
2. **`renderer-config.js`** (for renderer process)

### Usage

- **Main Process**: `config.API_BASE_URL`
- **Renderer Process**: `window.APP_CONFIG.API_BASE_URL`

### Environment Variables

For production, you can create a `.env` file:

```env
API_BASE_URL=https://api-prod-classcapsule.com
NODE_ENV=production
```

Then update the config files to read from environment variables:

```javascript
// config.js
const config = {
  API_BASE_URL: process.env.API_BASE_URL || 'https://api-dev-classcapsule.nfndev.com',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
``` 