/**
 * BatchProcessor - Utility for processing requests in controlled batches
 * Prevents overwhelming external APIs with rate limiting
 */

export interface BatchConfig {
  batchSize: number; // Number of items to process per batch
  delayBetweenBatches: number; // Milliseconds to wait between batches
  maxConcurrent?: number; // Max concurrent operations within a batch
}

export interface BatchResult<T, R> {
  item: T;
  result?: R;
  error?: Error;
  success: boolean;
}

/**
 * Process items in controlled batches with delays
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param config - Batch processing configuration
 * @returns Array of results with success/error status for each item
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  config: BatchConfig
): Promise<BatchResult<T, R>[]> {
  const results: BatchResult<T, R>[] = [];
  const { batchSize, delayBetweenBatches, maxConcurrent = batchSize } = config;

  // Split items into batches
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  console.log(`📦 Processing ${items.length} items in ${batches.length} batch(es)`);

  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);

    // Process items in batch with controlled concurrency
    const batchPromises = batch.map(async (item, itemIndex) => {
      const globalIndex = batchIndex * batchSize + itemIndex;
      try {
        const result = await processor(item, globalIndex);
        return {
          item,
          result,
          success: true,
        } as BatchResult<T, R>;
      } catch (error) {
        console.error(`❌ Failed to process item ${globalIndex}:`, error);
        return {
          item,
          error: error instanceof Error ? error : new Error(String(error)),
          success: false,
        } as BatchResult<T, R>;
      }
    });

    // Wait for batch to complete (with concurrency control)
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches (except after the last batch)
    if (batchIndex < batches.length - 1) {
      console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
      await sleep(delayBetweenBatches);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`✅ Batch processing complete: ${successCount}/${items.length} successful`);

  return results;
}

/**
 * Helper to sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
