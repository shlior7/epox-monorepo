import { NextRequest, NextResponse } from 'next/server';
import { withAdminReadSecurity } from '@/lib/security/admin-middleware';
import { generateAlerts, type AlertSeverity, type AlertType } from '@/lib/services/alert-service';

/**
 * Alerts API
 *
 * GET: Generate and return current alerts
 * Query params:
 * - severity: Filter by severity (critical, high, medium, low)
 * - type: Filter by type (quota_exceeded, high_cost, etc.)
 * - clientId: Filter by client ID
 */
export const GET = withAdminReadSecurity(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);

    const severity = searchParams.get('severity') as AlertSeverity | null;
    const type = searchParams.get('type') as AlertType | null;
    const clientId = searchParams.get('clientId');

    // Generate alerts
    const allAlerts = await generateAlerts({
      clientId: clientId || undefined,
      types: type ? [type] : undefined,
    });

    // Filter by severity if provided
    const filteredAlerts = severity
      ? allAlerts.filter((alert) => alert.severity === severity)
      : allAlerts;

    // Sort by severity (critical first) then timestamp
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    filteredAlerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return NextResponse.json({
      alerts: filteredAlerts,
      total: filteredAlerts.length,
      bySeverity: {
        critical: filteredAlerts.filter((a) => a.severity === 'critical').length,
        high: filteredAlerts.filter((a) => a.severity === 'high').length,
        medium: filteredAlerts.filter((a) => a.severity === 'medium').length,
        low: filteredAlerts.filter((a) => a.severity === 'low').length,
      },
    });
  } catch (error) {
    console.error('Failed to generate alerts:', error);
    return NextResponse.json({ error: 'Failed to generate alerts' }, { status: 500 });
  }
});
