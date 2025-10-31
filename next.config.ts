import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/**',
      },
    ],
  },
  turbopack: {
    resolveExtensions: ['.mdx', '.md', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      }
    }
  }
};

export default nextConfig;
