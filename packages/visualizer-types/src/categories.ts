/**
 * Category Types
 * Open, user-editable category system for grouping products
 */

import type { BubbleValue } from './bubbles';
import type { ImageAspectRatio, ImageQuality } from './settings';

// ===== SCENE TYPE SETTINGS (within a category) =====

/**
 * Settings for a specific scene type within a category.
 * Example: "Dining-Chairs in Living Room" has different settings than "Dining-Chairs in Dining Room"
 */
export interface SceneTypeGenerationSettings {
  sceneType: string;

  /** Bubbles that apply when this category + scene type combination */
  defaultBubbles: BubbleValue[];

  /** Style override for this scene type (overrides category default) */
  styleOverride?: string;

  /** Mood override for this scene type */
  moodOverride?: string;

  /** Lighting override for this scene type */
  lightingOverride?: string;

  /** Preferred camera angle for this scene type */
  preferredCameraAngle?: string;

  /** Background composition guidance */
  backgroundGuidance?: string;

  /** Props guidance for this scene type */
  propsGuidance?: string;
}

// ===== CATEGORY GENERATION SETTINGS =====

/**
 * Generation settings for a category.
 * Stored in the category.generationSettings JSONB column.
 *
 * All settings (style, lighting, human interaction, props, etc.) are represented
 * as bubbles in the defaultBubbles array. This keeps the system uniform and extensible.
 */
export interface CategoryGenerationSettings {
  /**
   * Default bubbles that apply to ALL products in this category.
   * Can include: style, lighting, mood, human-interaction, props, background, camera-angle, etc.
   */
  defaultBubbles: BubbleValue[];

  /**
   * Scene-type-specific settings within this category.
   * Key: scene type name (e.g., "Living Room", "Office")
   */
  sceneTypeSettings: Record<string, SceneTypeGenerationSettings>;
}

// ===== CLIENT GENERATION DEFAULTS =====

/**
 * Brand-level generation defaults.
 * Stored in client.generationDefaults JSONB column.
 *
 * Style, lighting, human interaction, etc. are all represented as bubbles.
 */
export interface ClientGenerationDefaults {
  /** Default aspect ratio */
  defaultAspectRatio?: ImageAspectRatio;

  /** Default image quality */
  defaultImageQuality?: ImageQuality;

  /**
   * Default bubbles that apply to ALL generations.
   * Can include: style, lighting, mood, human-interaction, props, background, etc.
   */
  defaultBubbles?: BubbleValue[];

  /** Whether the brand wizard has been completed */
  wizardCompleted?: boolean;

  /** Wizard progress state (for resuming) */
  wizardProgress?: WizardProgress;
}

// ===== WIZARD TYPES =====

export interface WizardProgress {
  /** Current step in the wizard */
  currentStep: string;

  /** Completed steps */
  completedSteps: string[];

  /** Answers collected so far */
  answers: Record<string, string | string[]>;

  /** Categories that have been configured */
  configuredCategories: string[];

  /** Last updated timestamp */
  lastUpdatedAt: string;
}

export interface WizardQuestion {
  id: string;
  question: string;
  type: 'single_choice' | 'multi_choice' | 'text';
  options?: WizardQuestionOption[];
  customInput?: boolean;
  customPlaceholder?: string;
  showIf?: (answers: Record<string, string | string[]>) => boolean;
}

export interface WizardQuestionOption {
  value: string;
  label: string;
  description?: string;
}

// ===== CATEGORY ENTITY =====

/**
 * Category entity as stored in the database.
 */
export interface Category {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  generationSettings?: CategoryGenerationSettings;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product-Category join entity.
 */
export interface ProductCategory {
  productId: string;
  categoryId: string;
  isPrimary: boolean;
  createdAt: Date;
}

// ===== DATABASE OPERATION TYPES =====

export interface CategoryCreate {
  clientId: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  generationSettings?: CategoryGenerationSettings;
  sortOrder?: number;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  generationSettings?: CategoryGenerationSettings;
  sortOrder?: number;
}

export interface ProductCategoryLink {
  productId: string;
  categoryId: string;
  isPrimary?: boolean;
}

// ===== DEFAULTS =====

export const DEFAULT_CATEGORY_GENERATION_SETTINGS: CategoryGenerationSettings = {
  defaultBubbles: [],
  sceneTypeSettings: {},
};

export const DEFAULT_CLIENT_GENERATION_DEFAULTS: ClientGenerationDefaults = {
  defaultAspectRatio: '1:1',
  defaultImageQuality: '2k',
  defaultBubbles: [],
  wizardCompleted: false,
};
