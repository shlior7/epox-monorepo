/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  devIndicators: false,
  typedRoutes: true,
  transpilePackages: ['@scenergy/supabase-service'],
  experimental: {
    viewTransition: true, // Enable View Transitions API (Next.js 16)
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'scenergy-imaginator.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
  webpack: (config) => {
    // Add SCSS path alias resolution
    config.resolve.alias['@/styles'] = path.join(__dirname, 'styles');
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/.local-s3/:path*',
        destination: '/api/local-s3/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
