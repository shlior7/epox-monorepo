export type AnnotationType = 'comment' | 'text' | 'highlight' | 'arrow';

export type ToolMode = 'select' | 'comment' | 'text' | 'highlight' | 'arrow';

export interface SelectorPosition {
  type: 'selector';
  selector: string;
  offsetX: number;
  offsetY: number;
}

export interface CoordinatePosition {
  type: 'coordinate';
  x: number; // % from left
  y: number; // % from top
  scrollY: number;
}

export type AnnotationPosition = SelectorPosition | CoordinatePosition;

export interface Reply {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  position: AnnotationPosition;
  content: string;
  color?: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies?: Reply[];
  // Arrow-specific properties
  endX?: number;
  endY?: number;
}

export interface PageRecord {
  id: string;
  url: string;
  title: string;
  thumbnail: string; // Base64 data URL
  visitedAt: string;
  annotations: Annotation[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pages: PageRecord[];
}

export interface UrlAnnotationStore {
  [normalizedUrl: string]: {
    annotations: Annotation[];
    lastVisited: string;
    title: string;
    thumbnail?: string; // Base64 data URL (optional)
  };
}

export interface ExtensionState {
  enabled: boolean;
  currentTool: ToolMode;
  activeAnnotationId: string | null;
  showAnnotations: boolean;
}

export interface Message {
  type: 'TOGGLE_EXTENSION' | 'SET_TOOL' | 'ADD_ANNOTATION' | 'DELETE_ANNOTATION' | 'UPDATE_ANNOTATION' | 'GET_ANNOTATIONS' | 'OPEN_SIDEPANEL';
  payload?: any;
}
