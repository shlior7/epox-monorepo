import { defineConfig } from 'vitest/config';

/**
 * Vitest workspace configuration for nested monorepo.
 * @see https://vitest.dev/guide/workspace
 */
export default defineConfig({
  test: {
    // This is a nested workspace - refer to root for actual test projects
  },
});
