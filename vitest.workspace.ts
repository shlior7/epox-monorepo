import { defineConfig } from 'vitest/config';

/**
 * Vitest workspace configuration for monorepo.
 * Groups all test projects to avoid "multiple projects" warning.
 * @see https://vitest.dev/guide/workspace
 */
export default defineConfig({
  test: {
    projects: [
      // Apps
      'apps/epox-platform',
      'apps/scenergy-visualizer',

      // Packages
      'packages/model-analyzer',

      // Services
      'services/product-config-service',
    ],
  },
});
