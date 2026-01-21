/**
 * Email Service
 * Sends transactional emails via Resend (or other providers)
 */

import type {
  SendEmailRequest,
  SendEmailResult,
  InvitationEmailPayload,
  GenerationCompletedEmailPayload,
  GenerationFailedEmailPayload,
  PasswordResetEmailPayload,
  WeeklyUsageSummaryPayload,
} from './types';
import { invitationEmail, generationCompletedEmail, generationFailedEmail, passwordResetEmail, weeklyUsageSummaryEmail } from './templates';

export interface EmailServiceConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  provider?: 'resend' | 'console'; // 'console' for development
}

export class EmailService {
  private readonly config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = {
      ...config,
      fromName: config.fromName ?? 'Epox Visualizer',
    };
  }

  /**
   * Send a raw email
   */
  async send(request: SendEmailRequest): Promise<SendEmailResult> {
    const from = request.from ?? {
      email: this.config.fromEmail,
      name: this.config.fromName,
    };

    if (this.config.provider === 'console') {
      // Development mode: log to console
      console.log('📧 Email would be sent:');
      console.log('  To:', Array.isArray(request.to) ? request.to.map((t) => t.email).join(', ') : request.to.email);
      console.log('  Subject:', request.subject);
      console.log('  From:', from.email);
      console.log('  ---');
      console.log(request.text || 'No text content');
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    // Use Resend API
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${from.name} <${from.email}>`,
          to: Array.isArray(request.to)
            ? request.to.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email))
            : request.to.name
              ? `${request.to.name} <${request.to.email}>`
              : request.to.email,
          subject: request.subject,
          html: request.html,
          text: request.text,
          reply_to: request.replyTo?.email,
          tags: request.tags?.map((name) => ({ name })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===== Template-based sending methods =====

  async sendInvitation(payload: InvitationEmailPayload): Promise<SendEmailResult> {
    const { subject, html, text } = invitationEmail(payload);
    return this.send({
      to: { email: payload.recipientEmail, name: payload.recipientName },
      subject,
      html,
      text,
      tags: ['invitation'],
    });
  }

  async sendGenerationCompleted(payload: GenerationCompletedEmailPayload): Promise<SendEmailResult> {
    const { subject, html, text } = generationCompletedEmail(payload);
    return this.send({
      to: { email: payload.recipientEmail, name: payload.recipientName },
      subject,
      html,
      text,
      tags: ['generation', 'completed'],
    });
  }

  async sendGenerationFailed(payload: GenerationFailedEmailPayload): Promise<SendEmailResult> {
    const { subject, html, text } = generationFailedEmail(payload);
    return this.send({
      to: { email: payload.recipientEmail, name: payload.recipientName },
      subject,
      html,
      text,
      tags: ['generation', 'failed'],
    });
  }

  async sendPasswordReset(payload: PasswordResetEmailPayload): Promise<SendEmailResult> {
    const { subject, html, text } = passwordResetEmail(payload);
    return this.send({
      to: { email: payload.recipientEmail, name: payload.recipientName },
      subject,
      html,
      text,
      tags: ['password-reset'],
    });
  }

  async sendWeeklyUsageSummary(payload: WeeklyUsageSummaryPayload): Promise<SendEmailResult> {
    const { subject, html, text } = weeklyUsageSummaryEmail(payload);
    return this.send({
      to: { email: payload.recipientEmail, name: payload.recipientName },
      subject,
      html,
      text,
      tags: ['usage-summary', 'weekly'],
    });
  }
}

// Singleton instance
let _emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!_emailService) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@epox.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'Epox Visualizer';

    // Use console provider if no API key (development)
    const provider = apiKey ? 'resend' : 'console';

    _emailService = new EmailService({
      apiKey: apiKey || '',
      fromEmail,
      fromName,
      provider,
    });
  }

  return _emailService;
}

export function resetEmailService(): void {
  _emailService = null;
}
