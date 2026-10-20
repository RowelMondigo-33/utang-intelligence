import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/utang-intelligence',
  assetPrefix: '/utang-intelligence/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;