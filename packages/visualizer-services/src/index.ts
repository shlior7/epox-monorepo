/**
 * Visualizer Services
 *
 * Non-AI business logic services shared across apps.
 */

export { InvitationService, getInvitationService, resetInvitationService } from './invitation';
export type {
  InvitationServiceConfig,
  InvitationTokenPayload,
  CreateInvitationRequest,
  AcceptInvitationRequest,
  InvitationDetails,
} from './invitation';

export { EmailService, getEmailService, resetEmailService } from './email';
export type {
  EmailServiceConfig,
  EmailAddress,
  SendEmailRequest,
  SendEmailResult,
  InvitationEmailPayload,
  GenerationCompletedEmailPayload,
  GenerationFailedEmailPayload,
  PasswordResetEmailPayload,
  WeeklyUsageSummaryPayload,
} from './email';

export { InspirationService, getInspirationService, resetInspirationService } from './inspiration';
export type {
  InspirationServiceConfig,
  InspirationImage,
  SceneAnalysisResult as InspirationSceneAnalysis,
  UnsplashSearchParams,
  UnsplashImage,
  UnsplashSearchResult,
  MergedInspirationSettings,
} from './inspiration';

export {
  FlowOrchestrationService,
  getFlowOrchestrationService,
  resetFlowOrchestrationService,
  buildPromptFromTags,
  buildPromptFromContext,
  generatePromptVariations,
} from './flow-orchestration';
export type {
  FlowOrchestrationServiceConfig,
  CreateFlowRequest,
  FlowCreationResult,
  PerProductSettings,
  PromptBuilderContext,
} from './flow-orchestration';

export { QuotaService, createQuotaService, PLAN_LIMITS } from './quota';
export type {
  QuotaServiceDependencies,
  PlanType,
  PlanLimits,
  QuotaStatus,
  QuotaCheckResult,
} from './quota';

export {
  NotificationService,
  getNotificationService,
  resetNotificationService,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notification';
export type {
  NotificationServiceConfig,
  NotificationType,
  NotificationChannel,
  NotificationPayload,
  BrowserNotificationPayload,
  NotificationPreferences,
} from './notification';

export { UserSettingsService, createUserSettingsService, DEFAULT_GENERATION_SETTINGS } from './user-settings';
export type {
  UserSettingsServiceDependencies,
  DefaultGenerationSettings,
  UserSettingsData,
} from './user-settings';
