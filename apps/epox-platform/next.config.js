/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['visualizer-types', 'visualizer-db', 'visualizer-services', '@scenergy/erp-service'],
  output: 'standalone',
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

module.exports = nextConfig;
