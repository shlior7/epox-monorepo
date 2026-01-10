'use client';

/**
 * Portal Component
 *
 * Renders children into a DOM node that exists outside the DOM hierarchy of the parent component.
 * This ensures modals, tooltips, and overlays always appear above other content regardless of
 * parent z-index or stacking context.
 *
 * Usage:
 *   <Portal>
 *     <YourModalContent />
 *   </Portal>
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Re-export Z_INDEX from common-styles for convenience
export { Z_INDEX } from '@/lib/styles/common-styles';

interface PortalProps {
  children: ReactNode;
  /** Optional container ID. If not provided, renders to document.body */
  containerId?: string;
}

export function Portal({ children, containerId }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);

    if (containerId) {
      // Use specified container or create one
      let element = document.getElementById(containerId);
      if (!element) {
        element = document.createElement('div');
        element.id = containerId;
        document.body.appendChild(element);
      }
      setContainer(element);
    } else {
      setContainer(document.body);
    }

    return () => {
      // Clean up created container if it's empty
      if (containerId) {
        const element = document.getElementById(containerId);
        if (element && element.childNodes.length === 0) {
          element.remove();
        }
      }
    };
  }, [containerId]);

  if (!mounted || !container) {
    return null;
  }

  return createPortal(children, container);
}
