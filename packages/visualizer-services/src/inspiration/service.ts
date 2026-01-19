/**
 * Inspiration Image Service
 * Handles inspiration image uploads, Unsplash integration, and scene analysis
 */

import type {
  InspirationImage,
  SceneAnalysisResult,
  UnsplashSearchParams,
  UnsplashSearchResult,
  MergedInspirationSettings,
} from './types';

export interface InspirationServiceConfig {
  unsplashAccessKey?: string;
}

export class InspirationService {
  private readonly unsplashAccessKey?: string;

  constructor(config: InspirationServiceConfig = {}) {
    this.unsplashAccessKey = config.unsplashAccessKey;
  }

  /**
   * Search Unsplash for inspiration images
   */
  async searchUnsplash(params: UnsplashSearchParams): Promise<UnsplashSearchResult> {
    if (!this.unsplashAccessKey) {
      throw new Error('Unsplash access key not configured');
    }

    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', params.query);
    url.searchParams.set('page', String(params.page ?? 1));
    url.searchParams.set('per_page', String(params.perPage ?? 20));
    url.searchParams.set('orientation', 'landscape');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Client-ID ${this.unsplashAccessKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      results: data.results,
      total: data.total,
      totalPages: data.total_pages,
    };
  }

  /**
   * Track download for Unsplash (required by their API guidelines)
   */
  async trackUnsplashDownload(downloadLocation: string): Promise<void> {
    if (!this.unsplashAccessKey) {return;}

    await fetch(downloadLocation, {
      headers: {
        'Authorization': `Client-ID ${this.unsplashAccessKey}`,
      },
    });
  }

  /**
   * Analyze a scene image (basic implementation without AI)
   * In production, this would use Gemini/GPT-4V for image analysis
   */
  analyzeSceneBasic(imageUrl: string): SceneAnalysisResult {
    // Basic fallback analysis when AI is not available
    return {
      style: 'Modern Minimalist',
      lighting: 'Natural Light',
      colorScheme: 'Neutral Tones',
      mood: 'Clean',
      props: [],
      dominantColors: ['#f5f5f5', '#e0e0e0', '#9e9e9e'],
      suggestedSettings: {
        style: 'Modern Minimalist',
        lighting: 'Natural Light',
        colorScheme: 'Neutral',
        surroundings: 'Moderate',
      },
      analyzedAt: new Date(),
    };
  }

  /**
   * Merge analyses from multiple inspiration images into unified settings
   */
  mergeInspirationAnalyses(
    inspirations: InspirationImage[]
  ): MergedInspirationSettings {
    if (inspirations.length === 0) {
      return {
        style: 'Modern Minimalist',
        lighting: 'Natural Light',
        colorScheme: 'Neutral',
        surroundings: 'Moderate',
        props: [],
        primaryImageUrl: '',
      };
    }

    // Use the first image's analysis as the base
    const primary = inspirations[0];
    const analysis = primary.analysis;

    if (!analysis) {
      return {
        style: 'Modern Minimalist',
        lighting: 'Natural Light',
        colorScheme: 'Neutral',
        surroundings: 'Moderate',
        props: [],
        primaryImageUrl: primary.url,
      };
    }

    // Collect all props from all inspirations
    const allProps = new Set<string>();
    for (const insp of inspirations) {
      if (insp.analysis?.props) {
        for (const prop of insp.analysis.props) {
          allProps.add(prop);
        }
      }
    }

    return {
      style: analysis.style,
      lighting: analysis.lighting,
      colorScheme: analysis.colorScheme,
      surroundings: analysis.suggestedSettings.surroundings,
      props: Array.from(allProps),
      primaryImageUrl: primary.url,
    };
  }

  /**
   * Generate suggested search queries based on product analysis
   */
  generateSearchSuggestions(
    sceneTypes: string[],
    styles: string[]
  ): string[] {
    const suggestions: string[] = [];

    for (const room of sceneTypes.slice(0, 3)) {
      for (const style of styles.slice(0, 2)) {
        suggestions.push(`${style.toLowerCase()} ${room.toLowerCase()}`);
      }
    }

    // Add some generic interior suggestions
    suggestions.push('minimalist interior');
    suggestions.push('modern home');
    suggestions.push('interior design');

    return suggestions.slice(0, 6);
  }
}

// Singleton instance
let _inspirationService: InspirationService | null = null;

export function getInspirationService(): InspirationService {
  _inspirationService ??= new InspirationService({
      unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY,
    });
  return _inspirationService;
}

export function resetInspirationService(): void {
  _inspirationService = null;
}



