import type { AnnotationPosition, CoordinatePosition, SelectorPosition } from '@/shared/types';
import { findElement } from './selector';

export interface ViewportPosition {
  x: number;
  y: number;
}

/**
 * Convert annotation position to viewport coordinates
 */
export function getViewportPosition(position: AnnotationPosition): ViewportPosition | null {
  if (position.type === 'coordinate') {
    const coord = position as CoordinatePosition;
    return {
      x: (coord.x / 100) * window.innerWidth,
      y: (coord.y / 100) * window.innerHeight + (window.scrollY - coord.scrollY),
    };
  }

  if (position.type === 'selector') {
    const sel = position as SelectorPosition;
    const element = findElement(sel.selector);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + sel.offsetX,
      y: rect.top + sel.offsetY,
    };
  }

  return null;
}

/**
 * Create coordinate position from click event
 */
export function createCoordinatePosition(e: MouseEvent): CoordinatePosition {
  return {
    type: 'coordinate',
    x: (e.clientX / window.innerWidth) * 100,
    y: ((e.clientY + window.scrollY) / window.innerHeight) * 100,
    scrollY: window.scrollY,
  };
}

/**
 * Create selector position from element and offset
 */
export function createSelectorPosition(_element: Element, offsetX: number, offsetY: number, selector: string): SelectorPosition {
  return {
    type: 'selector',
    selector,
    offsetX,
    offsetY,
  };
}
