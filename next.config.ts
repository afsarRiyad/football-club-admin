import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  
  // Performance optimizations
  compress: true,
  
  // Image optimization
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', '@dnd-kit/core', 'recharts'],
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
};

export default nextConfig;
