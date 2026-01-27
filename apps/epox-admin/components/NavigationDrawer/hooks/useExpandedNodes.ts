import { useEffect, useState } from 'react';

export function useExpandedNodes(storageKey = 'nav-expanded-nodes') {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedExpanded = localStorage.getItem(storageKey);
    if (!savedExpanded) return;

    try {
      const parsed: string[] = JSON.parse(savedExpanded);
      setExpandedNodes(new Set(parsed));
    } catch (err) {
      console.error('Failed to load expanded state:', err);
    }
  }, [storageKey]);

  useEffect(() => {
    const ids = Array.from(expandedNodes);
    localStorage.setItem(storageKey, JSON.stringify(ids));
  }, [expandedNodes, storageKey]);

  return { expandedNodes, setExpandedNodes };
}
