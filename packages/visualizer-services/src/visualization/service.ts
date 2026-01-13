import type { GeminiService } from '../gemini';
import { getGeminiService } from '../gemini';
import { generateSessionId } from '../utils';
import { buildCostOptimizedPrompt, generateCostOptimizedVariants } from './utils';
import type { VisualizationRequest, GenerationSession, VariantPreview } from '../types';

export class VisualizationService {
  private readonly gemini: GeminiService;
  private totalSessionCost = 0;

  constructor() {
    this.gemini = getGeminiService();
  }

  /**
   * Generate complete visualization session with cost-optimized approach
   */
  async generateVisualization(request: VisualizationRequest): Promise<GenerationSession> {
    const sessionId = generateSessionId();
    this.totalSessionCost = 0;

    console.log('💰 Starting cost-optimized visualization session...');

    const session: GenerationSession = {
      id: sessionId,
      request,
      variants: [],
      status: 'generating',
      createdAt: new Date().toISOString(),
    };

    try {
      // Step 1: Analyze product if asset provided (cost-aware)
      let productAnalysis = null;
      if (request.productAsset) {
        console.log('🔍 Analyzing product with minimal token usage...');
        try {
          productAnalysis = await this.gemini.analyzeProduct(request.productAsset);
          console.log('✅ Product analysis completed');
        } catch (error) {
          console.warn('⚠️ Product analysis failed, using defaults to avoid costs:', error);
        }
      }

      // Step 2: Generate ultra-efficient base prompt
      const basePrompt = buildCostOptimizedPrompt(request, productAnalysis ?? undefined);
      console.log(`📝 Base prompt optimized (${basePrompt.length} chars)`);

      // Step 3: Create minimal variant prompts (cost-conscious)
      const variantPrompts = generateCostOptimizedVariants(basePrompt, request.variants);
      console.log(`🎯 Generating ${variantPrompts.length} variants with minimal cost strategy`);

      // Step 4: Initialize variant previews
      session.variants = variantPrompts.map((prompt, index) => ({
        id: index + 1,
        summary: index === 0 ? 'Primary composition' : `Alt ${index}`,
        prompt,
        status: 'pending',
      }));

      // Step 5: Generate images with cost tracking and optimization
      for (let i = 0; i < session.variants.length; i++) {
        const variant = session.variants[i];
        variant.status = 'generating';

        try {
          console.log(`🎨 Generating variant ${i + 1}/${session.variants.length}...`);

          const geminiResponse = await this.gemini.generateImages({
            prompt: variant.prompt,
            imageAsset: request.productAsset?.file,
            count: 1, // Only generate 1 image per variant for cost efficiency
            aspectRatio: request.aspectRatio,
          });

          if (geminiResponse.images.length > 0) {
            variant.imageUrl = geminiResponse.images[0].url;
            variant.status = 'completed';

            // Track costs
            if (geminiResponse.metadata.cost) {
              this.totalSessionCost += geminiResponse.metadata.cost;
            }

            console.log(`✅ Variant ${i + 1} completed (${geminiResponse.metadata.model})`);
          } else {
            throw new Error('No images generated');
          }
        } catch (error) {
          variant.status = 'error';
          variant.error = error instanceof Error ? error.message : 'Generation failed';
          console.error(`❌ Variant ${i + 1} failed:`, error);
        }
      }

      session.status = 'completed';
      session.completedAt = new Date().toISOString();

      // Log final cost summary
      console.log(`💰 Session completed! Total estimated cost: $${this.totalSessionCost.toFixed(4)}`);
      console.log(`✅ VISUALIZATION: Session completed with ${session.variants.length} variants`);
    } catch (error) {
      session.status = 'error';
      console.error('Visualization generation failed:', error);
      throw error;
    }

    return session;
  }

  /**
   * Get session status and progress
   */
  async getSessionStatus(sessionId: string): Promise<Partial<GenerationSession>> {
    // In a real implementation, this would fetch from a database
    // For now, return a placeholder
    return {
      id: sessionId,
      status: 'completed',
    };
  }
}

// Lazy singleton instance - only instantiate when accessed
let _visualizationServiceInstance: VisualizationService | null = null;

export function getVisualizationService(): VisualizationService {
  _visualizationServiceInstance ??= new VisualizationService();
  return _visualizationServiceInstance;
}

// For backward compatibility - lazy proxy to avoid eager instantiation
export const visualizationService = {
  generateVisualization: (...args: Parameters<VisualizationService['generateVisualization']>) =>
    getVisualizationService().generateVisualization(...args),
  getSessionStatus: (...args: Parameters<VisualizationService['getSessionStatus']>) => getVisualizationService().getSessionStatus(...args),
};
