/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Fixes npm packages that resolve to `esm`
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    return config;
  },
  // Optional: Configure environment variables or other next.js settings
  env: {
    // You can add environment-specific variables here
    API_URL: process.env.API_URL || 'http://localhost:3000/api',
  }
  // Removed problematic redirects configuration
}

module.exports = nextConfig