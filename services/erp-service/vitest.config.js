'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const config_1 = require('vitest/config');
exports.default = (0, config_1.defineConfig)({
  test: {
    pool: 'threads',
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      STORE_CREDENTIALS_KEY: 'dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGtleXRlc3Q=', // 32 bytes base64
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidml0ZXN0LmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZpdGVzdC5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwwQ0FBNkM7QUFFN0Msa0JBQWUsSUFBQSxxQkFBWSxFQUFDO0lBQzFCLElBQUksRUFBRTtRQUNKLElBQUksRUFBRSxTQUFTO1FBQ2YsZUFBZSxFQUFFLElBQUk7UUFDckIsT0FBTyxFQUFFLENBQUMseUJBQXlCLENBQUM7UUFDcEMsT0FBTyxFQUFFLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztRQUNqQyxXQUFXLEVBQUUsS0FBSztRQUNsQixHQUFHLEVBQUU7WUFDSCxRQUFRLEVBQUUsTUFBTTtZQUNoQixxQkFBcUIsRUFBRSw4Q0FBOEMsRUFBRSxrQkFBa0I7U0FDMUY7UUFDRCxRQUFRLEVBQUU7WUFDUixRQUFRLEVBQUUsSUFBSTtZQUNkLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7WUFDMUIsT0FBTyxFQUFFLENBQUMsYUFBYSxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLGtCQUFrQixFQUFFLGNBQWMsQ0FBQztTQUM5QztLQUNGO0NBQ0YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHRlc3Q6IHtcbiAgICBwb29sOiAndGhyZWFkcycsXG4gICAgcGFzc1dpdGhOb1Rlc3RzOiB0cnVlLFxuICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoue3Rlc3Qsc3BlY30udHMnXSxcbiAgICBleGNsdWRlOiBbJ25vZGVfbW9kdWxlcycsICdkaXN0J10sXG4gICAgdGVzdFRpbWVvdXQ6IDEwMDAwLFxuICAgIGVudjoge1xuICAgICAgTk9ERV9FTlY6ICd0ZXN0JyxcbiAgICAgIFNUT1JFX0NSRURFTlRJQUxTX0tFWTogJ2RHVnpkR3RsZVhSbGMzUnJaWGwwWlhOMGEyVjVkR1Z6ZEd0bGVYUmxjM1E9JywgLy8gMzIgYnl0ZXMgYmFzZTY0XG4gICAgfSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nXSxcbiAgICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoudHMnXSxcbiAgICAgIGV4Y2x1ZGU6IFsnc3JjLyoqLyoudGVzdC50cycsICdzcmMvaW5kZXgudHMnXSxcbiAgICB9LFxuICB9LFxufSk7XG4iXX0=
