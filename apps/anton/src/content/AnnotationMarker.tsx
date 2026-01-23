import { useEffect, useState } from 'react';
import type { Annotation } from '@/shared/types';
import { getViewportPosition } from '@/lib/positioning';

interface AnnotationMarkerProps {
  annotation: Annotation;
  index: number;
  onClick: () => void;
  onDelete?: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
}

export function AnnotationMarker({ annotation, index, onClick, onUpdate }: AnnotationMarkerProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const pos = getViewportPosition(annotation.position);
      setPosition(pos);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [annotation.position]);

  if (!position) return null;

  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  // Comment pin
  if (annotation.type === 'comment') {
    return (
      <div
        className="anton-marker anton-comment-pin"
        style={style}
        onClick={onClick}
        data-testid={`anton-comment-${annotation.id}`}
      >
        {index + 1}
      </div>
    );
  }

  // Text label
  if (annotation.type === 'text') {
    return (
      <div
        className="anton-marker anton-text-label"
        style={style}
        onDoubleClick={() => setIsEditing(true)}
        data-testid={`anton-text-${annotation.id}`}
      >
        {isEditing ? (
          <input
            type="text"
            value={annotation.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditing(false);
            }}
            autoFocus
          />
        ) : (
          <span>{annotation.content || 'Double-click to edit'}</span>
        )}
      </div>
    );
  }

  // Arrow
  if (annotation.type === 'arrow' && annotation.endX && annotation.endY) {
    const endPos = { x: annotation.endX, y: annotation.endY };
    const length = Math.sqrt(
      Math.pow(endPos.x - position.x, 2) + Math.pow(endPos.y - position.y, 2)
    );
    const angle = Math.atan2(endPos.y - position.y, endPos.x - position.x) * (180 / Math.PI);

    return (
      <svg
        className="anton-marker anton-arrow"
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${length}px`,
          height: '2px',
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
        data-testid={`anton-arrow-${annotation.id}`}
      >
        <defs>
          <marker
            id={`arrowhead-${annotation.id}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={annotation.color || '#ef4444'} />
          </marker>
        </defs>
        <line
          x1="0"
          y1="1"
          x2={length}
          y2="1"
          stroke={annotation.color || '#ef4444'}
          strokeWidth="2"
          markerEnd={`url(#arrowhead-${annotation.id})`}
        />
      </svg>
    );
  }

  return null;
}
