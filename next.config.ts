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
      {
        protocol: 'https',
        hostname: 'euma9sxl9y.ufs.sh',
        pathname: '/f/**',
      }
    ],
  },
  headers: async () => {
    const longBrowserCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=604800, stale-while-revalidate=2592000",
      },
    ];
    return [
      { source: "/logo.png", headers: longBrowserCache },
      { source: "/favicon.ico", headers: longBrowserCache },
    ];
  },
  redirects: async () => {
    return [
      {
        source: '/img/badge-dark.png',
        destination: 'https://euma9sxl9y.ufs.sh/f/zxX0gGr1fg9cnaso9bhNGy79goWrVw5OTBFjMdbiXvASpLRE',
        permanent: false,
      },
    ];
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
