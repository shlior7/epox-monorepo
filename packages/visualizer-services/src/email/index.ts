export { EmailService, getEmailService, resetEmailService } from './service';
export type { EmailServiceConfig } from './service';
export type {
  EmailAddress,
  SendEmailRequest,
  SendEmailResult,
  InvitationEmailPayload,
  GenerationCompletedEmailPayload,
  GenerationFailedEmailPayload,
  PasswordResetEmailPayload,
  WeeklyUsageSummaryPayload,
} from './types';
export {
  invitationEmail,
  generationCompletedEmail,
  generationFailedEmail,
  passwordResetEmail,
  weeklyUsageSummaryEmail,
} from './templates';



