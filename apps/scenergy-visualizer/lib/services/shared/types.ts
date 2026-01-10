// ===== SHARED TYPES FOR ALL SERVICES =====

export interface ProductAsset {
  file: File;
  type: 'image' | 'model';
  preview?: string;
}

export interface VisualizationRequest {
  productName: string;
  productAsset?: ProductAsset;
  location: string;
  style: string;
  lighting: string;
  camera: string;
  cameraNotes: string;
  props: string;
  moodNotes: string;
  aspectRatio: string;
  resolution: string;
  variants: number;
  magnify: boolean;
  customPrompt?: string;
}

export interface VariantPreview {
  id: number;
  summary: string;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  imageUrl?: string;
  enhancedImageUrl?: string;
  error?: string;
}

export interface GenerationSession {
  id: string;
  request: VisualizationRequest;
  variants: VariantPreview[];
  status: 'idle' | 'generating' | 'enhancing' | 'completed' | 'error';
  createdAt: string;
  completedAt?: string;
}

// ===== ANALYSIS TYPES =====
export interface ProductAnalysis {
  materials: string[];
  colors: string[];
  style: string;
  suggestions: string[];
}
