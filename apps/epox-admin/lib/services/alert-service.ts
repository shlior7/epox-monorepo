/**
 * Alert Service
 *
 * Generates alerts based on database analytics and integrates with
 * external monitoring services (Betterstack, Sentry).
 */

import { db } from 'visualizer-db';
import { getDb } from 'visualizer-db';
import { client, aiCostTracking, usageRecord, quotaLimit } from 'visualizer-db/schema';
import { sql } from 'drizzle-orm';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType =
  | 'quota_exceeded'
  | 'quota_warning'
  | 'high_cost'
  | 'cost_spike'
  | 'high_error_rate'
  | 'recent_errors';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  clientId?: string;
  clientName?: string;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface AlertGenerationOptions {
  clientId?: string; // If provided, only generate alerts for this client
  types?: AlertType[]; // If provided, only generate these alert types
}

/**
 * Generate alerts based on current platform state
 */
export async function generateAlerts(options: AlertGenerationOptions = {}): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Get all clients or specific client
    const clients = options.clientId
      ? [await db.clients.getById(options.clientId)].filter(Boolean)
      : await db.clients.list();

    if (clients.length === 0) {
      return alerts;
    }

    // Check each client for alert conditions
    for (const clientData of clients) {
      if (!clientData) continue;

      // Get quota and usage
      const [quota, usage] = await Promise.all([
        db.quotaLimits.getByClientId(clientData.id),
        db.usageRecords.getCurrentUsage(clientData.id),
      ]);

      // Quota alerts
      if (quota && (!options.types || options.types.includes('quota_exceeded') || options.types.includes('quota_warning'))) {
        const usagePercentage = (usage / quota.monthlyGenerationLimit) * 100;

        if (usagePercentage >= 100) {
          alerts.push({
            id: `quota_exceeded_${clientData.id}`,
            type: 'quota_exceeded',
            severity: 'critical',
            clientId: clientData.id,
            clientName: clientData.name,
            title: 'Quota Exceeded',
            message: `${clientData.name} has exceeded their monthly generation quota (${usage}/${quota.monthlyGenerationLimit})`,
            value: usage,
            threshold: quota.monthlyGenerationLimit,
            timestamp: new Date(),
          });
        } else if (usagePercentage >= 80) {
          alerts.push({
            id: `quota_warning_${clientData.id}`,
            type: 'quota_warning',
            severity: usagePercentage >= 90 ? 'high' : 'medium',
            clientId: clientData.id,
            clientName: clientData.name,
            title: 'Quota Warning',
            message: `${clientData.name} is at ${usagePercentage.toFixed(1)}% of their monthly quota (${usage}/${quota.monthlyGenerationLimit})`,
            value: usagePercentage,
            threshold: 80,
            timestamp: new Date(),
          });
        }
      }

      // Cost alerts
      if (!options.types || options.types.includes('high_cost') || options.types.includes('cost_spike')) {
        const currentMonthCost = await db.aiCostTracking.getCurrentMonthCost(clientData.id);
        const currentMonthCostUsd = currentMonthCost / 100;

        // High cost alert (>$100 per month)
        if (currentMonthCostUsd > 100) {
          alerts.push({
            id: `high_cost_${clientData.id}`,
            type: 'high_cost',
            severity: currentMonthCostUsd > 500 ? 'critical' : 'high',
            clientId: clientData.id,
            clientName: clientData.name,
            title: 'High Monthly Cost',
            message: `${clientData.name} has incurred $${currentMonthCostUsd.toFixed(2)} in costs this month`,
            value: currentMonthCostUsd,
            threshold: 100,
            timestamp: new Date(),
          });
        }

        // Cost spike detection (compare to previous month)
        const lastMonthCost = await getLastMonthCost(clientData.id);
        if (lastMonthCost > 0) {
          const costIncrease = ((currentMonthCost - lastMonthCost) / lastMonthCost) * 100;
          if (costIncrease > 200) {
            // 200% increase
            alerts.push({
              id: `cost_spike_${clientData.id}`,
              type: 'cost_spike',
              severity: 'high',
              clientId: clientData.id,
              clientName: clientData.name,
              title: 'Cost Spike Detected',
              message: `${clientData.name} costs increased ${costIncrease.toFixed(0)}% compared to last month ($${(currentMonthCost / 100).toFixed(2)} vs $${(lastMonthCost / 100).toFixed(2)})`,
              value: costIncrease,
              threshold: 200,
              timestamp: new Date(),
              metadata: {
                currentMonthCost: currentMonthCost / 100,
                lastMonthCost: lastMonthCost / 100,
              },
            });
          }
        }
      }
    }

    // Platform-wide error rate check
    if (!options.types || options.types.includes('high_error_rate')) {
      const errorRateAlert = await checkErrorRate();
      if (errorRateAlert) {
        alerts.push(errorRateAlert);
      }
    }

    // Send critical alerts to external monitoring services
    for (const alert of alerts) {
      if (alert.severity === 'critical') {
        await sendToMonitoringServices(alert);
      }
    }

    return alerts;
  } catch (error) {
    console.error('[ALERT SERVICE] Failed to generate alerts:', error);
    return alerts;
  }
}

/**
 * Get last month's cost for a client
 */
async function getLastMonthCost(clientId: string): Promise<number> {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const summary = await db.aiCostTracking.getCostSummary(clientId, {
    startDate: lastMonth,
    endDate: lastMonthEnd,
  });

  return summary.totalCostUsdCents;
}

/**
 * Check platform-wide error rate
 */
async function checkErrorRate(): Promise<Alert | null> {
  const drizzle = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [result] = await drizzle
    .select({
      total: sql<number>`COUNT(*)`,
      failures: sql<number>`SUM(CASE WHEN ${aiCostTracking.success} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(aiCostTracking)
    .where(sql`${aiCostTracking.createdAt} >= ${oneHourAgo}`);

  if (!result || result.total === 0) return null;

  const errorRate = (result.failures / result.total) * 100;

  if (errorRate > 10) {
    // >10% error rate
    return {
      id: `high_error_rate_platform`,
      type: 'high_error_rate',
      severity: errorRate > 25 ? 'critical' : 'high',
      title: 'High Platform Error Rate',
      message: `Platform error rate is ${errorRate.toFixed(1)}% over the last hour (${result.failures}/${result.total} operations failed)`,
      value: errorRate,
      threshold: 10,
      timestamp: new Date(),
      metadata: {
        totalOperations: result.total,
        failedOperations: result.failures,
      },
    };
  }

  return null;
}

/**
 * Send alert to external monitoring services
 */
async function sendToMonitoringServices(alert: Alert): Promise<void> {
  // Send to Betterstack
  await sendToBetterstack(alert);

  // Send to Sentry
  await sendToSentry(alert);
}

/**
 * Send alert to Betterstack (Logtail/Uptime)
 */
async function sendToBetterstack(alert: Alert): Promise<void> {
  const betterstackToken = process.env.BETTERSTACK_SOURCE_TOKEN;

  if (!betterstackToken) {
    console.warn('[ALERT SERVICE] Betterstack token not configured');
    return;
  }

  try {
    await fetch('https://in.logs.betterstack.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${betterstackToken}`,
      },
      body: JSON.stringify({
        dt: alert.timestamp.toISOString(),
        level: alert.severity === 'critical' ? 'error' : 'warn',
        message: alert.message,
        context: {
          alert_id: alert.id,
          alert_type: alert.type,
          alert_severity: alert.severity,
          client_id: alert.clientId,
          client_name: alert.clientName,
          value: alert.value,
          threshold: alert.threshold,
          ...alert.metadata,
        },
      }),
    });

    console.log(`[ALERT SERVICE] Sent alert to Betterstack: ${alert.id}`);
  } catch (error) {
    console.error('[ALERT SERVICE] Failed to send to Betterstack:', error);
  }
}

/**
 * Send alert to Sentry
 */
async function sendToSentry(alert: Alert): Promise<void> {
  // Check if Sentry is available (imported in instrumentation)
  if (typeof globalThis !== 'undefined' && (globalThis as any).Sentry) {
    const Sentry = (globalThis as any).Sentry;

    try {
      Sentry.captureMessage(alert.message, {
        level: alert.severity === 'critical' ? 'error' : 'warning',
        tags: {
          alert_type: alert.type,
          alert_severity: alert.severity,
          client_id: alert.clientId,
        },
        extra: {
          alert_id: alert.id,
          client_name: alert.clientName,
          value: alert.value,
          threshold: alert.threshold,
          ...alert.metadata,
        },
      });

      console.log(`[ALERT SERVICE] Sent alert to Sentry: ${alert.id}`);
    } catch (error) {
      console.error('[ALERT SERVICE] Failed to send to Sentry:', error);
    }
  } else {
    console.warn('[ALERT SERVICE] Sentry not initialized');
  }
}

/**
 * Get alert severity color for UI
 */
export function getAlertSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return '#ef4444'; // red-500
    case 'high':
      return '#f97316'; // orange-500
    case 'medium':
      return '#f59e0b'; // amber-500
    case 'low':
      return '#3b82f6'; // blue-500
  }
}

/**
 * Get alert type icon for UI
 */
export function getAlertTypeIcon(type: AlertType): string {
  switch (type) {
    case 'quota_exceeded':
    case 'quota_warning':
      return 'alert-circle';
    case 'high_cost':
    case 'cost_spike':
      return 'dollar-sign';
    case 'high_error_rate':
    case 'recent_errors':
      return 'alert-triangle';
  }
}
