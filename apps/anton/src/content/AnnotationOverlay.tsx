import React, { useEffect, useState } from 'react';
import type { Annotation, ToolMode } from '@/shared/types';
import { AnnotationMarker } from './AnnotationMarker';
import { CommentThread } from './CommentThread';
import { createCoordinatePosition } from '@/lib/positioning';
import { getAnnotationsForUrl, saveAnnotationsForUrl } from '@/shared/storage';

export function AnnotationOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolMode>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowEnd, setArrowEnd] = useState<{ x: number; y: number } | null>(null);

  // Load annotations for current URL
  useEffect(() => {
    loadAnnotations();
  }, []);

  const loadAnnotations = async () => {
    const stored = await getAnnotationsForUrl(window.location.href);
    setAnnotations(stored);
  };

  const saveAnnotations = async (newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
    await saveAnnotationsForUrl(window.location.href, newAnnotations);
  };

  const addAnnotation = (annotation: Annotation) => {
    saveAnnotations([...annotations, annotation]);
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    saveAnnotations(
      annotations.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const deleteAnnotation = (id: string) => {
    saveAnnotations(annotations.filter((a) => a.id !== id));
    if (activeCommentId === id) {
      setActiveCommentId(null);
    }
  };

  // Handle click on page
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!enabled) return;

    // Close active comment if clicking outside
    if (activeCommentId && !(e.target as HTMLElement).closest('.anton-comment-thread')) {
      setActiveCommentId(null);
    }

    // Don't create annotation if clicking on existing marker or thread
    if ((e.target as HTMLElement).closest('.anton-marker, .anton-comment-thread, .anton-toolbar')) {
      return;
    }

    // Comment tool
    if (currentTool === 'comment') {
      const content = prompt('Enter your comment:');
      if (!content) return;

      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'comment',
        position: createCoordinatePosition(e.nativeEvent),
        content,
        author: 'User',
        createdAt: new Date().toISOString(),
        resolved: false,
        replies: [],
      };

      addAnnotation(annotation);
      setCurrentTool('select');
    }

    // Text label tool
    if (currentTool === 'text') {
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'text',
        position: createCoordinatePosition(e.nativeEvent),
        content: '',
        author: 'User',
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      addAnnotation(annotation);
      setCurrentTool('select');
    }

    // Arrow tool
    if (currentTool === 'arrow' && !isDrawingArrow) {
      setIsDrawingArrow(true);
      setArrowStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle arrow drawing
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingArrow && arrowStart) {
      setArrowEnd({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDrawingArrow && arrowStart) {
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'arrow',
        position: createCoordinatePosition({
          clientX: arrowStart.x,
          clientY: arrowStart.y,
        } as MouseEvent),
        content: '',
        color: '#ef4444',
        author: 'User',
        createdAt: new Date().toISOString(),
        resolved: false,
        endX: e.clientX,
        endY: e.clientY,
      };

      addAnnotation(annotation);
      setIsDrawingArrow(false);
      setArrowStart(null);
      setArrowEnd(null);
      setCurrentTool('select');
    }
  };

  // Handle text selection for highlights
  useEffect(() => {
    const handleSelection = () => {
      if (!enabled || currentTool !== 'highlight') return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Create highlight annotation
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'highlight',
        position: createCoordinatePosition({
          clientX: rect.left,
          clientY: rect.top,
        } as MouseEvent),
        content: selection.toString(),
        color: '#fde047',
        author: 'User',
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      addAnnotation(annotation);
      selection.removeAllRanges();
      setCurrentTool('select');
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [enabled, currentTool]);

  // Listen for messages
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'TOGGLE_EXTENSION') {
        setEnabled((prev) => !prev);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;

      if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('text');
      } else if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        setCurrentTool('arrow');
      } else if (e.key === 'Escape') {
        setCurrentTool('select');
        setActiveCommentId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className={`anton-overlay ${enabled ? 'anton-active' : ''}`}
      onClick={handleOverlayClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      data-testid="anton-overlay"
    >
      {/* Toolbar */}
      <div className="anton-toolbar" data-testid="anton-toolbar">
        <button
          className={`anton-tool-btn ${currentTool === 'select' ? 'anton-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentTool('select');
          }}
          title="Select (Esc)"
          data-testid="anton-tool-select"
        >
          ↖
        </button>
        <button
          className={`anton-tool-btn ${currentTool === 'comment' ? 'anton-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentTool('comment');
          }}
          title="Comment"
          data-testid="anton-tool-comment"
        >
          💬
        </button>
        <button
          className={`anton-tool-btn ${currentTool === 'text' ? 'anton-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentTool('text');
          }}
          title="Text (T)"
          data-testid="anton-tool-text"
        >
          T
        </button>
        <button
          className={`anton-tool-btn ${currentTool === 'highlight' ? 'anton-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentTool('highlight');
          }}
          title="Highlight"
          data-testid="anton-tool-highlight"
        >
          ✓
        </button>
        <button
          className={`anton-tool-btn ${currentTool === 'arrow' ? 'anton-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentTool('arrow');
          }}
          title="Arrow (A)"
          data-testid="anton-tool-arrow"
        >
          →
        </button>
        <div style={{ width: '1px', background: '#333', margin: '0 4px' }} />
        <button
          className="anton-tool-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowAnnotations(!showAnnotations);
          }}
          title="Toggle visibility"
          data-testid="anton-toggle-visibility"
        >
          {showAnnotations ? '👁' : '👁‍🗨'}
        </button>
        <button
          className="anton-tool-btn"
          onClick={(e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
          }}
          title="Open side panel"
          data-testid="anton-open-sidepanel"
        >
          ☰
        </button>
      </div>

      {/* Annotations */}
      {showAnnotations &&
        annotations.map((annotation, index) => (
          <AnnotationMarker
            key={annotation.id}
            annotation={annotation}
            index={index}
            onClick={() => {
              if (annotation.type === 'comment') {
                setActiveCommentId(annotation.id);
              }
            }}
            onDelete={() => deleteAnnotation(annotation.id)}
            onUpdate={(updates) => updateAnnotation(annotation.id, updates)}
          />
        ))}

      {/* Active comment thread */}
      {activeCommentId && showAnnotations && (
        <CommentThread
          annotation={annotations.find((a) => a.id === activeCommentId)!}
          onClose={() => setActiveCommentId(null)}
          onUpdate={(updates) => updateAnnotation(activeCommentId, updates)}
          onDelete={() => deleteAnnotation(activeCommentId)}
        />
      )}

      {/* Arrow preview while drawing */}
      {isDrawingArrow && arrowStart && arrowEnd && (
        <svg
          className="anton-drawing-canvas"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <marker
              id="arrowhead-preview"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
          <line
            x1={arrowStart.x}
            y1={arrowStart.y}
            x2={arrowEnd.x}
            y2={arrowEnd.y}
            stroke="#ef4444"
            strokeWidth="2"
            markerEnd="url(#arrowhead-preview)"
          />
        </svg>
      )}
    </div>
  );
}
