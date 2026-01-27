/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  devIndicators: false,
  typedRoutes: true,
  transpilePackages: ['visualizer-ai'],
  experimental: {
    viewTransition: true, // Enable View Transitions API (Next.js 16)
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-b173dd19ec2840a5b068d4748260373f.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
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
