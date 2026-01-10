import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace configuration for monorepo.
 * Groups all test projects to avoid "multiple projects" warning.
 * @see https://vitest.dev/guide/workspace
 */
export default defineWorkspace([
  // Apps
  'apps/scenergy-catalog',
  'apps/scenery-next',
  'apps/scenergy-visualizer',

  // Packages
  'packages/model-analyzer',

  // Services
  'services/product-config-service',
]);
