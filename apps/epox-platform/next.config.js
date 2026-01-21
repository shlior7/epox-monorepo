const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['visualizer-types', 'visualizer-db', 'visualizer-ai', '@scenergy/erp-service'],
  output: 'standalone',
  // Required to build with Turbopack when webpack config is present.
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-b173dd19ec2840a5b068d4748260373f.r2.dev',
      },
    ],
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Upload source maps to Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from browser devtools in production
  hideSourceMaps: true,

  // Disable Sentry webpack plugin in development
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
