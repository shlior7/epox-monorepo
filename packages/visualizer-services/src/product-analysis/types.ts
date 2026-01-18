/**
 * Product Analysis Service Types
 */

export interface ProductAnalysisInput {
  productId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  imageUrl?: string;
}

/** Size analysis result - can be general or specific dimensions */
export interface ProductSize {
  /** General size category */
  type: 'small' | 'medium' | 'large' | 'specific';
  /** Specific dimensions if determinable (e.g. "1.60 x 1.90 m") */
  dimensions?: string;
}

/** Color scheme detected in a product (for products with multiple color options) */
export interface ColorScheme {
  /** Name of the color scheme (e.g. "Natural Oak", "Charcoal Gray") */
  name: string;
  /** Individual colors in this scheme */
  colors: string[];
}

/** AI-powered analysis result with structured data for image generation */
export interface AIAnalysisResult {
  /** Type of product (e.g. "sofa", "dining table", "bed frame") */
  productType: string;
  /** Room types where this product fits (e.g. ["Living Room", "Office"]) */
  sceneTypes: string[];
  /** Color schemes available (for products with multiple options) */
  colorSchemes: ColorScheme[];
  /** Detected materials (e.g. ["wood", "fabric", "metal"]) */
  materials: string[];
  /** Size assessment */
  size: ProductSize;
  /** Design styles (e.g. ["Modern", "Scandinavian"]) */
  styles: string[];
  /** Confidence score 0-1 */
  confidence: number;
  /** Method used for analysis */
  analysisMethod: 'ai' | 'fallback';
}

export interface ProductAnalysisResult {
  productId: string;
  sceneType: string;
  productType: string;
  style: string[];
  materials: string[];
  colors: {
    primary: string;
    accent?: string[];
  };
  /** New AI-powered structured analysis */
  aiAnalysis?: AIAnalysisResult;
  suggestedsceneTypes: string[];
  suggestedStyles: string[];
  promptKeywords: string[];
  confidence: number;
}

export interface BatchAnalysisResult {
  sceneTypeDistribution: Record<string, number>;
  productTypes: string[];
  dominantCategory: string;
  suggestedStyles: string[];
  recommendedInspirationKeywords: string[];
  productRoomAssignments: Record<string, string>;
  products: ProductAnalysisResult[];
  analyzedAt: Date;
}

export interface AnalysisOptions {
  useAI?: boolean;
  includeImageAnalysis?: boolean;
}
