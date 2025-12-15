# Setting Up the Web App for Desktop

To make the desktop app work with your existing Next.js web application, we need to create a static export of your web app.

## Steps:

### 1. Update Next.js Configuration

Add export configuration to `apps/web/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Add this line
  images: {
    unoptimized: true,  // Required for static export
  },
  // ... rest of your config
}

module.exports = nextConfig
```

### 2. Update API calls to work with Electron

In `apps/web/lib/api.ts`, modify it to detect if running in Electron:

```typescript
import axios from 'axios';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

const api = isElectron 
  ? (window as any).ElectronAPI 
  : axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    });

// Only add interceptors if not Electron
if (!isElectron) {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}

export default api;
```

### 3. Build the Web App

```bash
cd apps/web
npm run build
```

This will create a static export in `apps/web/out/` directory.

### 4. Copy to Desktop App

After building, the Electron app will serve these static files.

## Alternative Approach

If the above seems complex, we can create a simplified standalone desktop app that bundles everything. Let me know if you prefer that approach!
