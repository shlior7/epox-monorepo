'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * SceneLoader - A creative generation loader that simulates scene building
 *
 * Shows animated silhouettes of scene elements (house, tree, sun, hills, etc.)
 * being "painted" into existence, creating an engaging visual while generating.
 */

interface SceneElement {
  id: string;
  name: string;
  path: string;
  x: number;
  y: number;
  scale: number;
  delay: number;
  duration: number;
}

const SCENE_ELEMENTS: SceneElement[] = [
  {
    id: 'sun',
    name: 'Sun',
    path: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 6a6 6 0 100 12 6 6 0 000-12z',
    x: 75,
    y: 15,
    scale: 1.2,
    delay: 0,
    duration: 1.5,
  },
  {
    id: 'cloud1',
    name: 'Cloud',
    path: 'M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242',
    x: 20,
    y: 18,
    scale: 1,
    delay: 0.3,
    duration: 1.2,
  },
  {
    id: 'cloud2',
    name: 'Cloud',
    path: 'M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242',
    x: 55,
    y: 12,
    scale: 0.8,
    delay: 0.6,
    duration: 1.2,
  },
  {
    id: 'mountain1',
    name: 'Mountain',
    path: 'M3 20h18L14 7l-4.5 7L6 10l-3 10z',
    x: 10,
    y: 55,
    scale: 1.5,
    delay: 0.4,
    duration: 1.8,
  },
  {
    id: 'mountain2',
    name: 'Mountain',
    path: 'M3 20h18L14 7l-4.5 7L6 10l-3 10z',
    x: 50,
    y: 50,
    scale: 2,
    delay: 0.7,
    duration: 1.8,
  },
  {
    id: 'tree1',
    name: 'Tree',
    path: 'M12 22v-7m0 0l-3-3m3 3l3-3m-6.5-7.5a3.5 3.5 0 117 0c0 1.93-1.57 3.5-3.5 3.5S5.5 7.43 5.5 5.5z',
    x: 25,
    y: 62,
    scale: 1.3,
    delay: 1.2,
    duration: 1,
  },
  {
    id: 'tree2',
    name: 'Tree',
    path: 'M12 22v-7m0 0l-3-3m3 3l3-3m-6.5-7.5a3.5 3.5 0 117 0c0 1.93-1.57 3.5-3.5 3.5S5.5 7.43 5.5 5.5z',
    x: 72,
    y: 65,
    scale: 1,
    delay: 1.4,
    duration: 1,
  },
  {
    id: 'house',
    name: 'House',
    path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    x: 45,
    y: 60,
    scale: 1.5,
    delay: 1.6,
    duration: 1.5,
  },
  {
    id: 'star1',
    name: 'Star',
    path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    x: 85,
    y: 25,
    scale: 0.6,
    delay: 2,
    duration: 0.8,
  },
  {
    id: 'bird',
    name: 'Bird',
    path: 'M16 7h.01M3.4 18H12a8 8 0 008-8V7a4 4 0 00-7.28-2.3L2 20h1.4z',
    x: 35,
    y: 20,
    scale: 0.7,
    delay: 2.2,
    duration: 0.8,
  },
];

interface SceneLoaderProps {
  /** Generation progress (0-100) */
  progress?: number;
  /** Status message */
  status?: string;
  /** Optional label for the progress */
  label?: string;
  /** Whether we're generating images or video */
  type?: 'image' | 'video';
  className?: string;
}

export function SceneLoader({
  progress = 0,
  status = 'Generating...',
  label,
  type = 'image',
  className,
}: SceneLoaderProps) {
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [animationCycle, setAnimationCycle] = useState(0);

  // Calculate which elements should be visible based on progress and time
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    SCENE_ELEMENTS.forEach((element) => {
      const timeout = setTimeout(() => {
        setVisibleElements((prev) => new Set(prev).add(element.id));
      }, element.delay * 1000);
      intervals.push(timeout);
    });

    // Reset cycle after all elements appear
    const resetTimeout = setTimeout(() => {
      setAnimationCycle((c) => c + 1);
      setVisibleElements(new Set());
    }, 4000);
    intervals.push(resetTimeout);

    return () => {
      intervals.forEach(clearTimeout);
    };
  }, [animationCycle]);

  // Calculate how many elements to show based on progress
  const progressElements = useMemo(() => {
    const count = Math.floor((progress / 100) * SCENE_ELEMENTS.length);
    return SCENE_ELEMENTS.slice(0, Math.max(1, count));
  }, [progress]);

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      {/* Scene Canvas */}
      <div className="relative mb-8 h-48 w-64 overflow-hidden rounded-2xl bg-gradient-to-b from-primary/5 via-background to-muted/30">
        {/* Background gradient animation */}
        <div className="absolute inset-0 animate-pulse bg-gradient-to-tr from-primary/10 via-transparent to-accent/10 opacity-50" />

        {/* Horizon line */}
        <div className="absolute bottom-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/40 to-transparent" />

        {/* Scene Elements */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {SCENE_ELEMENTS.map((element) => {
            const isVisible = visibleElements.has(element.id);
            return (
              <g
                key={element.id}
                style={{
                  transform: `translate(${element.x}%, ${element.y}%) scale(${element.scale})`,
                  transformOrigin: 'center',
                }}
              >
                <g
                  className={cn(
                    'transition-all duration-1000',
                    isVisible ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{
                    transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(10px)',
                    transformOrigin: 'center',
                  }}
                >
                  <path
                    d={element.path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      'text-primary/60 transition-colors duration-500',
                      isVisible && 'text-primary'
                    )}
                    style={{
                      strokeDasharray: 100,
                      strokeDashoffset: isVisible ? 0 : 100,
                      transition: `stroke-dashoffset ${element.duration}s ease-out`,
                    }}
                  />
                </g>
              </g>
            );
          })}
        </svg>

        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-primary/40"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 20}%`,
                animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          style={{
            animation: 'shimmer 2s infinite',
          }}
        />
      </div>

      {/* Status */}
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold text-foreground">{status}</h3>
        {label && <p className="mb-3 text-sm text-muted-foreground">{label}</p>}

        {/* Progress bar */}
        <div className="mx-auto w-56">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {Math.round(progress)}% complete
          </p>
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-8px) scale(1.2);
            opacity: 0.8;
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * CompactSceneLoader - A smaller version for inline use
 */
interface CompactSceneLoaderProps {
  progress?: number;
  className?: string;
}

export function CompactSceneLoader({ progress = 0, className }: CompactSceneLoaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Mini animated icon */}
      <div className="relative h-8 w-8">
        <svg viewBox="0 0 24 24" className="h-full w-full animate-pulse">
          <path
            d="M12 2L2 7l10 5 10-5-10-5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />
          <path
            d="M2 17l10 5 10-5M2 12l10 5 10-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary/50"
          />
        </svg>
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      </div>

      {/* Progress */}
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
      </div>

      <span className="min-w-[3rem] text-right text-xs text-muted-foreground">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
