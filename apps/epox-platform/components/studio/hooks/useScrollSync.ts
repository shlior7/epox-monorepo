'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseScrollSyncOptions {
  /**
   * List of scene types to track
   */
  sceneTypes: string[];
  /**
   * Whether scroll sync is enabled
   */
  enabled?: boolean;
  /**
   * Threshold for intersection observer (0-1)
   */
  threshold?: number;
  /**
   * Root margin for intersection observer
   */
  rootMargin?: string;
  /**
   * Debounce time for scroll updates (ms)
   */
  debounceMs?: number;
}

export interface UseScrollSyncResult {
  /**
   * Currently active (most visible) scene type
   */
  activeSceneType: string | null;
  /**
   * Scroll to a specific scene type in the main view
   */
  scrollToSceneType: (sceneType: string) => void;
  /**
   * Ref to attach to the scrollable container
   */
  containerRef: React.RefObject<HTMLElement>;
  /**
   * Whether we're currently scrolling programmatically
   */
  isScrolling: boolean;
}

/**
 * Hook for bi-directional scroll synchronization between
 * the config panel and the main content view.
 *
 * - When user scrolls the main view, the active scene type updates
 * - When user clicks a scene type in the panel, the main view scrolls
 */
export function useScrollSync({
  sceneTypes,
  enabled = true,
  threshold = 0.1,
  rootMargin = '-100px 0px -50% 0px',
  debounceMs = 100,
}: UseScrollSyncOptions): UseScrollSyncResult {
  const [activeSceneType, setActiveSceneType] = useState<string | null>(
    sceneTypes[0] || null
  );
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const isScrollingFromPanel = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Set up intersection observer for main view -> panel sync
  useEffect(() => {
    if (!enabled || sceneTypes.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Don't update if we're programmatically scrolling
        if (isScrollingFromPanel.current) return;

        // Find the most visible section
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;

        // Sort by intersection ratio (most visible first)
        visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const topEntry = visibleEntries[0];
        const sceneType = topEntry.target.getAttribute('data-scene-type');

        if (sceneType && sceneType !== activeSceneType) {
          // Debounce the update
          if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
          }
          scrollTimeout.current = setTimeout(() => {
            setActiveSceneType(sceneType);
          }, debounceMs);
        }
      },
      {
        root: container,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        rootMargin,
      }
    );

    // Observe all scene type sections
    sceneTypes.forEach((sceneType) => {
      const element = container.querySelector(`[data-scene-type="${sceneType}"]`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [sceneTypes, enabled, threshold, rootMargin, debounceMs, activeSceneType]);

  // Scroll to a specific scene type (panel -> main view)
  const scrollToSceneType = useCallback(
    (sceneType: string) => {
      if (!enabled) return;

      const container = containerRef.current;
      if (!container) return;

      const element = container.querySelector(`[data-scene-type="${sceneType}"]`);
      if (!element) return;

      // Set flag to prevent observer from updating during programmatic scroll
      isScrollingFromPanel.current = true;
      setIsScrolling(true);
      setActiveSceneType(sceneType);

      // Scroll to the element
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      // Reset flag after scroll animation completes
      setTimeout(() => {
        isScrollingFromPanel.current = false;
        setIsScrolling(false);
      }, 500);
    },
    [enabled]
  );

  return {
    activeSceneType,
    scrollToSceneType,
    containerRef: containerRef as React.RefObject<HTMLElement>,
    isScrolling,
  };
}
