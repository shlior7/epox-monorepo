'use client';

/**
 * Bubble Modal Router
 * Routes to the appropriate modal component based on bubble type
 * Uses the bubble registry for automatic routing
 */

import type { BubbleValue } from 'visualizer-types';
import { getBubbleDefinition } from '../bubbles/registry';

interface BubbleModalRouterProps {
  bubbleType: string;
  value: Partial<BubbleValue>;
  onSave: (value: BubbleValue | BubbleValue[]) => void;
  onClose: () => void;
}

export function BubbleModalRouter({ bubbleType, value, onSave, onClose }: BubbleModalRouterProps) {
  const definition = getBubbleDefinition(bubbleType);

  // If bubble type not found in registry, show error
  if (!definition) {
    console.error(`Bubble definition not found for type: ${bubbleType}`);
    return null;
  }

  const Modal = definition.Modal;

  // Render the modal component from the registry
  // Type assertion needed because we can't know the specific bubble type at compile time
  return <Modal value={value as any} onSave={onSave as any} onClose={onClose} />;
}
