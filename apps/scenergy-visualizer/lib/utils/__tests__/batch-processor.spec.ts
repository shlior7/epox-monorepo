/**
 * Tests for BatchProcessor utility
 * Following TDD principles from copilot-instructions.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processBatch, BatchConfig } from '../batch-processor';

describe('BatchProcessor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process all items successfully', async () => {
    const items = [1, 2, 3, 4, 5];
    const processor = vi.fn(async (item: number) => item * 2);
    const config: BatchConfig = {
      batchSize: 2,
      delayBetweenBatches: 1000,
    };

    const promise = processBatch(items, processor, config);

    // Fast-forward through all timers
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(5);
    expect(results.every((r) => r.success)).toBe(true);
    expect(results.map((r) => r.result)).toEqual([2, 4, 6, 8, 10]);
    expect(processor).toHaveBeenCalledTimes(5);
  });

  it('should handle errors gracefully', async () => {
    const items = [1, 2, 3];
    const processor = vi.fn(async (item: number) => {
      if (item === 2) {
        throw new Error('Test error');
      }
      return item * 2;
    });
    const config: BatchConfig = {
      batchSize: 3,
      delayBetweenBatches: 0,
    };

    const promise = processBatch(items, processor, config);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(3);
    expect(results[0].success).toBe(true);
    expect(results[0].result).toBe(2);
    expect(results[1].success).toBe(false);
    expect(results[1].error?.message).toBe('Test error');
    expect(results[2].success).toBe(true);
    expect(results[2].result).toBe(6);
  });

  it('should process items in batches with delays', async () => {
    const items = [1, 2, 3, 4, 5];
    const processor = vi.fn(async (item: number) => item * 2);
    const config: BatchConfig = {
      batchSize: 2,
      delayBetweenBatches: 1000,
    };

    const promise = processBatch(items, processor, config);

    // First batch (items 1, 2)
    await vi.advanceTimersByTimeAsync(0);
    expect(processor).toHaveBeenCalledTimes(2);

    // Wait for delay
    await vi.advanceTimersByTimeAsync(1000);

    // Second batch (items 3, 4)
    expect(processor).toHaveBeenCalledTimes(4);

    // Wait for delay
    await vi.advanceTimersByTimeAsync(1000);

    // Third batch (item 5)
    expect(processor).toHaveBeenCalledTimes(5);

    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(5);
  });

  it('should handle empty array', async () => {
    const items: number[] = [];
    const processor = vi.fn(async (item: number) => item * 2);
    const config: BatchConfig = {
      batchSize: 2,
      delayBetweenBatches: 1000,
    };

    const promise = processBatch(items, processor, config);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(0);
    expect(processor).not.toHaveBeenCalled();
  });

  it('should respect batch size configuration', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const processor = vi.fn(async (item: number) => item);
    const config: BatchConfig = {
      batchSize: 3,
      delayBetweenBatches: 500,
    };

    const promise = processBatch(items, processor, config);

    // First batch (3 items)
    await vi.advanceTimersByTimeAsync(0);
    expect(processor).toHaveBeenCalledTimes(3);

    // Second batch
    await vi.advanceTimersByTimeAsync(500);
    expect(processor).toHaveBeenCalledTimes(6);

    // Third batch
    await vi.advanceTimersByTimeAsync(500);
    expect(processor).toHaveBeenCalledTimes(9);

    // Fourth batch (1 item)
    await vi.advanceTimersByTimeAsync(500);
    expect(processor).toHaveBeenCalledTimes(10);

    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(10);
  });

  it('should pass correct index to processor', async () => {
    const items = ['a', 'b', 'c'];
    const processor = vi.fn(async (item: string, index: number) => `${item}-${index}`);
    const config: BatchConfig = {
      batchSize: 2,
      delayBetweenBatches: 0,
    };

    const promise = processBatch(items, processor, config);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(processor).toHaveBeenNthCalledWith(1, 'a', 0);
    expect(processor).toHaveBeenNthCalledWith(2, 'b', 1);
    expect(processor).toHaveBeenNthCalledWith(3, 'c', 2);
    expect(results.map((r) => r.result)).toEqual(['a-0', 'b-1', 'c-2']);
  });

  it('should include original item in result', async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const processor = vi.fn(async (item: (typeof items)[0]) => item.id * 2);
    const config: BatchConfig = {
      batchSize: 3,
      delayBetweenBatches: 0,
    };

    const promise = processBatch(items, processor, config);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results[0].item).toEqual({ id: 1 });
    expect(results[1].item).toEqual({ id: 2 });
    expect(results[2].item).toEqual({ id: 3 });
  });

  it('should accept maxConcurrent configuration without affecting result ordering', async () => {
    const items = [1, 2, 3, 4];
    const activeCounters: number[] = [];

    const processor = vi.fn(async (item: number) => {
      activeCounters.push(activeCounters.length + 1);
      await Promise.resolve();
      activeCounters.pop();
      return item;
    });

    const config: BatchConfig = {
      batchSize: 4,
      delayBetweenBatches: 0,
      maxConcurrent: 2,
    };

    const promise = processBatch(items, processor, config);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results.map((r) => r.result)).toEqual([1, 2, 3, 4]);
    expect(processor).toHaveBeenCalledTimes(4);
  });
});
