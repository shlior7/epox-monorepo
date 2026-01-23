/**
 * Claude Service - AI-powered fix generation for Anton annotations
 *
 * Uses Anthropic's Claude API to generate code fixes based on:
 * - Annotation content (user description of issue)
 * - Element HTML and styles
 * - Multiple selector fallbacks
 * - Screen location and bounding box
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeTaskRequest {
  annotationContent: string;
  elementContext: {
    selectors: string[];
    html: string;
    styles: Record<string, string>;
    screenshot?: string;
    boundingRect: {
      width: number;
      height: number;
      top: number;
      left: number;
    };
  };
  pageUrl: string;
  screenLocation?: {
    x: number;
    y: number;
  };
}

export interface ClaudeTaskResponse {
  taskId: string;
  status: 'sent' | 'in_progress' | 'completed' | 'failed';
  response?: string;
  errorMessage?: string;
}

export class ClaudeService {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate a fix prompt for Claude based on annotation context
   */
  generateFixPrompt(request: ClaudeTaskRequest): string {
    const { annotationContent, elementContext, pageUrl, screenLocation } = request;

    // Format styles for readability
    const stylesFormatted = Object.entries(elementContext.styles)
      .map(([key, value]) => `  ${key}: ${value}`)
      .join('\n');

    // Format selectors with priority
    const selectorsFormatted = elementContext.selectors
      .map((selector, i) => `${i + 1}. \`${selector}\` ${i === elementContext.selectors.length - 1 ? '(most specific)' : ''}`)
      .join('\n');

    return `# Fix Request from Anton Annotation

## Context
- **Page**: ${pageUrl}
- **Issue**: ${annotationContent}

## Element HTML
\`\`\`html
${elementContext.html}
\`\`\`

## Element Styles (Computed)
\`\`\`css
${stylesFormatted}
\`\`\`

## Element Selectors (Fallback Chain)
The following selectors can be used to target this element (ordered by specificity):

${selectorsFormatted}

## Element Position
- **Bounding Box**: ${elementContext.boundingRect.width}px × ${elementContext.boundingRect.height}px
- **Position**: top: ${elementContext.boundingRect.top}px, left: ${elementContext.boundingRect.left}px
${screenLocation ? `- **Screen Location**: (${screenLocation.x}%, ${screenLocation.y}%)` : ''}

## Task
Analyze the issue described above and propose a fix. Provide:
1. **Root Cause**: What is causing the issue?
2. **Proposed Fix**: Specific code changes needed (HTML, CSS, or JavaScript)
3. **Implementation Steps**: How to apply the fix
4. **Testing**: How to verify the fix works

Please be specific and actionable.
`;
  }

  /**
   * Create a Claude task to generate a fix
   */
  async createTask(request: ClaudeTaskRequest): Promise<ClaudeTaskResponse> {
    try {
      const prompt = this.generateFixPrompt(request);

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text content from response
      const responseText = message.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      return {
        taskId: message.id,
        status: 'completed',
        response: responseText,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      return {
        taskId: `error-${Date.now()}`,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get task status (for async operations)
   */
  async getTaskStatus(taskId: string): Promise<ClaudeTaskResponse> {
    // Note: Claude's Messages API is synchronous
    // This method is a placeholder for potential future async operations
    return {
      taskId,
      status: 'completed',
    };
  }
}

// Singleton instance
let cachedService: ClaudeService | null = null;

/**
 * Get singleton Claude service instance
 */
export function getClaudeService(): ClaudeService {
  if (!cachedService) {
    cachedService = new ClaudeService();
  }
  return cachedService;
}

/**
 * Reset singleton (useful for testing)
 */
export function resetClaudeService(): void {
  cachedService = null;
}
