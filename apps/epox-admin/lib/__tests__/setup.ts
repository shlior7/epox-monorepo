/**
 * Test Setup and Configuration
 * Sets up global test environment and utilities
 */

import { vi } from 'vitest';

// Mock console methods to reduce noise in tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

export function suppressConsole() {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
}

export function restoreConsole() {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
}

// Helper to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to wait for a condition to be true
export async function waitForCondition(condition: () => boolean, timeout: number = 5000, interval: number = 50): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await waitFor(interval);
  }
}

// Mock timers utilities
export function useFakeTimers() {
  vi.useFakeTimers();
}

export function useRealTimers() {
  vi.useRealTimers();
}

export function advanceTimersByTime(ms: number) {
  vi.advanceTimersByTime(ms);
}

export async function runOnlyPendingTimers() {
  await vi.runOnlyPendingTimersAsync();
}

export async function runAllTimers() {
  await vi.runAllTimersAsync();
}
