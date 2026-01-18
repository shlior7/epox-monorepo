/**
 * Email Service Types
 */

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SendEmailRequest {
  to: EmailAddress | EmailAddress[];
  subject: string;
  html: string;
  text?: string;
  from?: EmailAddress;
  replyTo?: EmailAddress;
  tags?: string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Template-specific payloads

export interface InvitationEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  clientName: string;
  invitationUrl: string;
  expiresInDays: number;
}

export interface GenerationCompletedEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  sessionName: string;
  imageCount: number;
  resultsUrl: string;
}

export interface GenerationFailedEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  sessionName: string;
  failedCount: number;
  totalCount: number;
  errorSummary: string;
  resultsUrl: string;
}

export interface PasswordResetEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface WeeklyUsageSummaryPayload {
  recipientEmail: string;
  recipientName?: string;
  clientName: string;
  weekStartDate: string;
  weekEndDate: string;
  generationsUsed: number;
  generationsLimit: number;
  topProducts: Array<{ name: string; count: number }>;
  dashboardUrl: string;
}


