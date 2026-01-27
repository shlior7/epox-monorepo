import path from 'path';

/**
 * Get screenshots directory for a test file
 * Each test folder has its own screenshots directory
 * @param testDir - The directory containing the test file (usually __dirname from test file)
 */
export function getScreenshotsDir(testDir: string): string {
  return path.join(testDir, 'screenshots');
}

// Legacy: Screenshots output directory (deprecated - use getScreenshotsDir instead)
// Kept for backward compatibility
export const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
