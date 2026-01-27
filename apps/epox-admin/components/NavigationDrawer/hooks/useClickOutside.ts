import { useEffect, type RefObject } from 'react';

export function useClickOutside(refs: RefObject<HTMLElement | null>[], handlers: Array<() => void>) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      refs.forEach((ref, index) => {
        const handler = handlers[index];
        if (!handler) return;
        const element = ref.current;
        if (!element) {
          return;
        }
        if (!element.contains(event.target as Node)) {
          handler();
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, handlers]);
}
