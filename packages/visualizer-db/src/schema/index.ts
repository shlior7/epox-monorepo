/**
 * Database Schema Index
 * Re-exports all schema tables and relations
 */

// Auth tables (Better Auth compatible)
export {
  adminUser,
  adminSession,
  user,
  session,
  account,
  verification,
  client,
  organization, // Legacy alias
  member,
  invitation,
  adminUserRelations,
  adminSessionRelations,
  userRelations,
  sessionRelations,
  accountRelations,
  clientRelations,
  organizationRelations, // Legacy alias
  memberRelations,
  invitationRelations,
} from './auth';

// Product tables
export {
  product,
  productImage,
  productRelations,
  productImageRelations,
} from './products';

// Session tables
export {
  chatSession,
  studioSession,
  clientSession, // Legacy alias
  message,
  flow,
  chatSessionRelations,
  studioSessionRelations,
  clientSessionRelations, // Legacy alias
  messageRelations,
  flowRelations,
} from './sessions';

// Generated images
export {
  generatedImage,
  favoriteImage,
  generatedImageRelations,
  favoriteImageRelations,
} from './generated-images';

// Re-export types from visualizer-types for convenience
export type {
  ClientMetadata,
  OrganizationMetadata, // Legacy alias
  CommerceConfig,
  AIModelConfig,
  FlowStatus,
  FlowGenerationSettings,
  PostAdjustments,
  MessagePart,
  TextMessagePart,
  ImageMessagePart,
  PromptSettingsMessagePart,
} from 'visualizer-types';
