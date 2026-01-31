const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    'visualizer-types',
    'visualizer-db',
    'visualizer-ai',
    'visualizer-auth',
    'visualizer-storage',
    '@scenergy/erp-service',
  ],
  output: 'standalone',
  // Required to build with Turbopack when webpack config is present.
  turbopack: {},
  images: {
    unoptimized: true,
  },
  // Webpack configuration to exclude server-only modules from browser bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle pg and its dependencies for the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        pg: false,
        'pg-native': false,
        'pg-hstore': false,
        dns: false,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
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
