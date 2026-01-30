/**
 * Visualizer Client
 *
 * Business logic services for client management:
 * - Invitation: Team member invitations
 * - Email: Email sending via Resend
 * - Notification: Browser notifications
 * - User Settings: User preferences
 * - Quota: Usage quota management
 * - Inspiration: Unsplash integration for inspiration images
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

export { QuotaService, createQuotaService, createQuotaServiceFromDb, PLAN_LIMITS, CREDIT_COSTS, getCreditCost } from './quota';
export type { QuotaServiceDependencies, PlanType, PlanLimits, QuotaStatus, QuotaCheckResult, CreditOperationType } from './quota';

export { NotificationService, getNotificationService, resetNotificationService, DEFAULT_NOTIFICATION_PREFERENCES } from './notification';
export type {
  NotificationServiceConfig,
  NotificationType,
  NotificationChannel,
  NotificationPayload,
  BrowserNotificationPayload,
  NotificationPreferences,
} from './notification';

export { UserSettingsService, createUserSettingsService, DEFAULT_GENERATION_SETTINGS } from './user-settings';
export type { UserSettingsServiceDependencies, DefaultGenerationSettings, UserSettingsData } from './user-settings';
