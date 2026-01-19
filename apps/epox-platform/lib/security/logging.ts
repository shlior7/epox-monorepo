/**
 * Security Event Logging
 *
 * Centralized logging for security-related events.
 * Helps with monitoring, alerting, and incident response.
 */

import { SECURITY_FLAGS } from './config';

// ============================================================================
// TYPES
// ============================================================================

export type SecurityEventType =
  | 'auth_failure'
  | 'auth_error'
  | 'unauthorized_access_attempt'
  | 'ownership_check_failed'
  | 'placeholder_client_in_production'
  | 'path_traversal_attempt'
  | 'rate_limit_exceeded'
  | 'ssrf_blocked'
  | 'invalid_input'
  | 'suspicious_request';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Logs a security event
 *
 * In production, this should integrate with your monitoring service
 * (e.g., Datadog, Sentry, CloudWatch)
 */
export function logSecurityEvent(type: SecurityEventType, data: Record<string, unknown>): void {
  if (!SECURITY_FLAGS.ENABLE_SECURITY_LOGGING) {
    return;
  }

  const event: SecurityEvent = {
    type,
    timestamp: new Date().toISOString(),
    data: sanitizeLogData(data),
  };

  // Log to console (structured for log aggregators)
  console.log(JSON.stringify({ security_event: event }));

  // TODO: In production, send to monitoring service:
  // - Sentry.captureMessage(`Security Event: ${type}`, { extra: event });
  // - datadog.log(event);
  // - cloudwatch.putMetricData(...)
}

/**
 * Sanitizes log data to prevent sensitive information leakage
 */
function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'session',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = `${value.substring(0, 100)}... [truncated]`;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// ALERT HELPERS
// ============================================================================

/**
 * High-severity security events that should trigger alerts
 */
const HIGH_SEVERITY_EVENTS: SecurityEventType[] = [
  'unauthorized_access_attempt',
  'path_traversal_attempt',
  'ssrf_blocked',
  'placeholder_client_in_production',
];

/**
 * Logs a high-severity security event with alerting
 */
export function logSecurityAlert(type: SecurityEventType, data: Record<string, unknown>): void {
  logSecurityEvent(type, data);

  if (HIGH_SEVERITY_EVENTS.includes(type) && process.env.NODE_ENV === 'production') {
    // TODO: Trigger real-time alert
    // - PagerDuty/OpsGenie integration
    // - Slack webhook
    // - Email notification
    console.error(`🚨 SECURITY ALERT: ${type}`, data);
  }
}
