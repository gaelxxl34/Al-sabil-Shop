import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Only apply webpack config for production builds to avoid Turbopack conflicts
  webpack: (config, { isServer, dev }) => {
    // Skip webpack customizations in development mode (uses Turbopack)
    if (dev) {
      return config;
    }

    if (isServer) {
      // Ignore source map warnings for server-side bundles
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        {
          module: /@google-cloud\/firestore/,
        },
      ];
    } else {
      // Exclude Puppeteer from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        dns: false,
      };
    }
    
    // Always exclude puppeteer from client bundle
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push('puppeteer');
    }
    
    return config;
  },
};

export default nextConfig;
