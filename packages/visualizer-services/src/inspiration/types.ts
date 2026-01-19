/**
 * Inspiration Image Service Types
 */

export interface InspirationImage {
  id: string;
  url: string;
  source: 'upload' | 'unsplash' | 'library';
  unsplashId?: string;
  unsplashAttribution?: {
    photographerName: string;
    photographerUrl: string;
    unsplashUrl: string;
  };
  analysis?: SceneAnalysisResult;
}

export interface SceneAnalysisResult {
  style: string;
  lighting: string;
  colorScheme: string;
  sceneType?: string;
  mood: string;
  props: string[];
  dominantColors: string[];
  suggestedSettings: {
    style: string;
    lighting: string;
    colorScheme: string;
    surroundings: string;
  };
  analyzedAt: Date;
}

export interface UnsplashSearchParams {
  query: string;
  page?: number;
  perPage?: number;
}

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    links: { html: string };
  };
  links: {
    download_location: string;
  };
  width: number;
  height: number;
  description?: string;
  altDescription?: string;
}

export interface UnsplashSearchResult {
  results: UnsplashImage[];
  total: number;
  totalPages: number;
}

export interface MergedInspirationSettings {
  style: string;
  lighting: string;
  colorScheme: string;
  surroundings: string;
  props: string[];
  primaryImageUrl: string;
}



