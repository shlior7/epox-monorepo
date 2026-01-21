/**
 * Bull Board Dashboard
 *
 * Web-based dashboard for monitoring BullMQ queues.
 */

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import type { Router } from 'express';

/**
 * Bull Board configuration
 */
export interface BullBoardConfig {
  redisUrl: string;
  queueNames?: string[];
  basePath?: string;
}

/**
 * Create a Bull Board Express app
 */
export function createBullBoardApp(config: BullBoardConfig): {
  serverAdapter: ExpressAdapter;
  addQueue: (queueName: string) => void;
  removeQueue: (queueName: string) => void;
} {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(config.basePath ?? '/admin/queues');

  const queueAdapters: Map<string, BullMQAdapter> = new Map();
  const queues: Map<string, Queue> = new Map();

  // Initialize with default queue names
  const defaultQueues = config.queueNames ?? ['ai-jobs'];

  const { addQueue, removeQueue } = createBullBoard({
    queues: [],
    serverAdapter,
  });

  // Add initial queues
  for (const queueName of defaultQueues) {
    const queue = new Queue(queueName, {
      connection: {
        url: config.redisUrl,
        maxRetriesPerRequest: null,
      },
    });
    queues.set(queueName, queue);

    const adapter = new BullMQAdapter(queue);
    queueAdapters.set(queueName, adapter);
    addQueue(adapter);
  }

  return {
    serverAdapter,
    addQueue: (queueName: string) => {
      if (queues.has(queueName)) return;

      const queue = new Queue(queueName, {
        connection: {
          url: config.redisUrl,
          maxRetriesPerRequest: null,
        },
      });
      queues.set(queueName, queue);

      const adapter = new BullMQAdapter(queue);
      queueAdapters.set(queueName, adapter);
      addQueue(adapter);
    },
    removeQueue: (queueName: string) => {
      const adapter = queueAdapters.get(queueName);
      if (adapter) {
        removeQueue(adapter);
        queueAdapters.delete(queueName);
      }

      const queue = queues.get(queueName);
      if (queue) {
        queue.close();
        queues.delete(queueName);
      }
    },
  };
}

/**
 * Get Bull Board router for use in Express apps
 */
export function getBullBoardRouter(config: BullBoardConfig): Router {
  const { serverAdapter } = createBullBoardApp(config);
  return serverAdapter.getRouter();
}
