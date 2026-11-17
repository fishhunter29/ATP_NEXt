import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // photos are pre-sized WebP files in /public/img; serve them as they are
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
