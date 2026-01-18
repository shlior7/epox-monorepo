/**
 * Services - Centralized exports for all shared services
 *
 * This file re-exports from shared packages:
 * - visualizer-services: AI/Gemini generation
 * - visualizer-db: Database operations
 * - visualizer-storage: File storage (R2/S3)
 * - visualizer-auth: Authentication
 *
 * Plus app-specific utilities:
 * - prompt-builder: Build prompts from tags
 */

// ===== Shared Services =====

// Gemini AI Service
export * from './gemini';

// Database Service
export * from './db';

// Storage Service
export * from './storage';

// Auth Service
export * from './auth';

// ===== App-Specific Utilities =====

// Prompt Builder (UI-specific helper for wizard tags)
export {
  buildPromptFromTags,
  buildFullGenerationPrompt,
  estimateGenerationComplexity,
  getAISuggestedTags,
  mergeTagSuggestions,
} from './prompt-builder';
