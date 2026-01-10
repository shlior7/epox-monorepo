/**
 * Message Types
 * Types for chat messages and message parts
 */

import type { FlowGenerationSettings, PromptSettings } from './settings';

// ===== MESSAGE PARTS =====

export type MessagePartType = 'text' | 'image' | 'prompt-settings';

export interface TextMessagePart {
  type: 'text';
  content: string;
}

export interface ImageMessagePart {
  type: 'image';
  imageIds: string[];
  jobId?: string;
  status?: 'pending' | 'generating' | 'completed' | 'error';
  progress?: number;
  error?: string;
  metadata?: {
    prompt?: string;
    settings?: FlowGenerationSettings | PromptSettings;
    productName?: string;
  };
  productId?: string;
}

export interface PromptSettingsMessagePart {
  type: 'prompt-settings';
  settings: FlowGenerationSettings | PromptSettings;
}

export type MessagePart = TextMessagePart | ImageMessagePart | PromptSettingsMessagePart;

// ===== MESSAGE ROLE =====

export type MessageRole = 'user' | 'assistant';

// ===== GENERATION STATUS =====

export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'error';
