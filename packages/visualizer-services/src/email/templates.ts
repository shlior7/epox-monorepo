/**
 * Email Templates
 * HTML email templates for various notifications
 */

import type {
  InvitationEmailPayload,
  GenerationCompletedEmailPayload,
  GenerationFailedEmailPayload,
  PasswordResetEmailPayload,
  WeeklyUsageSummaryPayload,
} from './types';

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { text-align: center; margin-bottom: 32px; }
  .logo { font-size: 24px; font-weight: 700; color: #0f172a; }
  h1 { font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #0f172a; }
  p { margin: 0 0 16px 0; color: #475569; }
  .button { display: inline-block; padding: 14px 28px; background: #0f172a; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 24px 0; }
  .button:hover { background: #1e293b; }
  .footer { text-align: center; margin-top: 32px; font-size: 13px; color: #94a3b8; }
  .stats { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .stat { display: inline-block; text-align: center; padding: 0 20px; }
  .stat-value { font-size: 28px; font-weight: 700; color: #0f172a; }
  .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
`;

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">Epox Visualizer</div>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Epox. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function invitationEmail(payload: InvitationEmailPayload): { subject: string; html: string; text: string } {
  const subject = `You've been invited to ${payload.clientName} on Epox Visualizer`;

  const html = wrapTemplate(`
    <h1>You're Invited!</h1>
    <p>${payload.inviterName} has invited you to join <strong>${payload.clientName}</strong> on Epox Visualizer — the easiest way to create beautiful product images with AI.</p>
    <p style="text-align: center;">
      <a href="${payload.invitationUrl}" class="button">Accept Invitation</a>
    </p>
    <p style="font-size: 13px; color: #94a3b8;">This invitation expires in ${payload.expiresInDays} days.</p>
  `);

  const text = `
You've been invited to ${payload.clientName} on Epox Visualizer!

${payload.inviterName} has invited you to join ${payload.clientName} on Epox Visualizer — the easiest way to create beautiful product images with AI.

Accept your invitation here: ${payload.invitationUrl}

This invitation expires in ${payload.expiresInDays} days.
  `.trim();

  return { subject, html, text };
}

export function generationCompletedEmail(payload: GenerationCompletedEmailPayload): { subject: string; html: string; text: string } {
  const subject = `Your images are ready! — ${payload.sessionName}`;

  const html = wrapTemplate(`
    <h1>Your Images Are Ready! 🎉</h1>
    <p>Great news! Your generation session "<strong>${payload.sessionName}</strong>" has completed successfully.</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${payload.imageCount}</div>
        <div class="stat-label">Images Generated</div>
      </div>
    </div>
    <p style="text-align: center;">
      <a href="${payload.resultsUrl}" class="button">View Your Images</a>
    </p>
  `);

  const text = `
Your Images Are Ready!

Great news! Your generation session "${payload.sessionName}" has completed successfully.

${payload.imageCount} images were generated.

View your images: ${payload.resultsUrl}
  `.trim();

  return { subject, html, text };
}

export function generationFailedEmail(payload: GenerationFailedEmailPayload): { subject: string; html: string; text: string } {
  const subject = `Generation issue — ${payload.sessionName}`;

  const html = wrapTemplate(`
    <h1>Generation Complete with Issues</h1>
    <p>Your generation session "<strong>${payload.sessionName}</strong>" has completed, but some images couldn't be generated.</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${payload.totalCount - payload.failedCount}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #dc2626;">${payload.failedCount}</div>
        <div class="stat-label">Failed</div>
      </div>
    </div>
    <p><strong>Error Summary:</strong> ${payload.errorSummary}</p>
    <p style="text-align: center;">
      <a href="${payload.resultsUrl}" class="button">View Results & Retry</a>
    </p>
  `);

  const text = `
Generation Complete with Issues

Your generation session "${payload.sessionName}" has completed, but some images couldn't be generated.

Completed: ${payload.totalCount - payload.failedCount}
Failed: ${payload.failedCount}

Error Summary: ${payload.errorSummary}

View results and retry: ${payload.resultsUrl}
  `.trim();

  return { subject, html, text };
}

export function passwordResetEmail(payload: PasswordResetEmailPayload): { subject: string; html: string; text: string } {
  const subject = 'Reset your password — Epox Visualizer';

  const html = wrapTemplate(`
    <h1>Reset Your Password</h1>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <p style="text-align: center;">
      <a href="${payload.resetUrl}" class="button">Reset Password</a>
    </p>
    <p style="font-size: 13px; color: #94a3b8;">This link expires in ${payload.expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.</p>
  `);

  const text = `
Reset Your Password

We received a request to reset your password. Click the link below to create a new password:

${payload.resetUrl}

This link expires in ${payload.expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.
  `.trim();

  return { subject, html, text };
}

export function weeklyUsageSummaryEmail(payload: WeeklyUsageSummaryPayload): { subject: string; html: string; text: string } {
  const subject = `Weekly Summary — ${payload.clientName}`;

  const usagePercent = Math.round((payload.generationsUsed / payload.generationsLimit) * 100);

  const topProductsHtml = payload.topProducts.length > 0
    ? `<ul>${payload.topProducts.map(p => `<li>${p.name}: ${p.count} generations</li>`).join('')}</ul>`
    : '<p>No products generated this week.</p>';

  const html = wrapTemplate(`
    <h1>Weekly Summary</h1>
    <p>Here's your usage summary for ${payload.clientName} from ${payload.weekStartDate} to ${payload.weekEndDate}.</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${payload.generationsUsed}</div>
        <div class="stat-label">Generations Used</div>
      </div>
      <div class="stat">
        <div class="stat-value">${usagePercent}%</div>
        <div class="stat-label">of ${payload.generationsLimit}</div>
      </div>
    </div>
    <h3>Top Products</h3>
    ${topProductsHtml}
    <p style="text-align: center;">
      <a href="${payload.dashboardUrl}" class="button">View Dashboard</a>
    </p>
  `);

  const text = `
Weekly Summary — ${payload.clientName}
${payload.weekStartDate} to ${payload.weekEndDate}

Generations Used: ${payload.generationsUsed} of ${payload.generationsLimit} (${usagePercent}%)

Top Products:
${payload.topProducts.map(p => `- ${p.name}: ${p.count} generations`).join('\n')}

View dashboard: ${payload.dashboardUrl}
  `.trim();

  return { subject, html, text };
}


