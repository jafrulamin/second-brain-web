import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['pdf-parse', 'canvas', '@napi-rs/canvas'],
  
  // Performance optimizations
  compress: true, // Enable gzip compression
  
  // Reduce logging in production
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
  
  // React strict mode for better debugging
  reactStrictMode: true,
};

export default nextConfig;

