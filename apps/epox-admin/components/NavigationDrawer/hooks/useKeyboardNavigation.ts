import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export function useKeyboardNavigation(isMobile: boolean, setIsOpen: (open: boolean) => void) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listItemRefs = useRef<(HTMLElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent, totalItems: number) => {
    const { key } = event;

    switch (key) {
      case 'ArrowDown': {
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.min(prev + 1, totalItems - 1);
          listItemRefs.current[next]?.focus();
          return next;
        });
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          listItemRefs.current[next]?.focus();
          return next;
        });
        break;
      }
      case 'Home': {
        event.preventDefault();
        setFocusedIndex(0);
        listItemRefs.current[0]?.focus();
        break;
      }
      case 'End': {
        event.preventDefault();
        const lastIndex = totalItems - 1;
        setFocusedIndex(lastIndex);
        listItemRefs.current[lastIndex]?.focus();
        break;
      }
      case 'Escape': {
        if (isMobile) {
          setIsOpen(false);
        }
        break;
      }
      default:
        break;
    }
  };

  return { focusedIndex, setFocusedIndex, listItemRefs, handleKeyDown };
}
