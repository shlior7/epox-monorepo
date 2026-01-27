'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, DollarSign, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  clientId?: string;
  clientName?: string;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
}

interface AlertsResponse {
  alerts: Alert[];
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export default function AdminAlertsPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchAlerts();

    // Auto-refresh every 30 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setLoading(true);
    fetchAlerts();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getAlertIcon = (type: string) => {
    if (type.includes('quota')) return AlertCircle;
    if (type.includes('cost')) return DollarSign;
    return AlertTriangle;
  };

  return (
    <div className="admin-alerts" data-testid="admin-alerts">
      <div className="admin-alerts__header">
        <div>
          <h1 className="admin-alerts__title">Alerts & Monitoring</h1>
          <p className="admin-alerts__subtitle">
            Real-time alerts for quota, cost, and error monitoring
          </p>
        </div>

        <div className="admin-alerts__actions">
          <label className="admin-alerts__auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              data-testid="auto-refresh-toggle"
            />
            <span>Auto-refresh (30s)</span>
          </label>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="admin-alerts__refresh"
            data-testid="manual-refresh-button"
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error" data-testid="admin-error">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="admin-alerts__summary">
            <div className="admin-alerts__summary-item" style={{ borderColor: '#ef4444' }}>
              <span className="admin-alerts__summary-value" style={{ color: '#ef4444' }}>
                {data.bySeverity.critical}
              </span>
              <span className="admin-alerts__summary-label">Critical</span>
            </div>
            <div className="admin-alerts__summary-item" style={{ borderColor: '#f97316' }}>
              <span className="admin-alerts__summary-value" style={{ color: '#f97316' }}>
                {data.bySeverity.high}
              </span>
              <span className="admin-alerts__summary-label">High</span>
            </div>
            <div className="admin-alerts__summary-item" style={{ borderColor: '#f59e0b' }}>
              <span className="admin-alerts__summary-value" style={{ color: '#f59e0b' }}>
                {data.bySeverity.medium}
              </span>
              <span className="admin-alerts__summary-label">Medium</span>
            </div>
            <div className="admin-alerts__summary-item" style={{ borderColor: '#3b82f6' }}>
              <span className="admin-alerts__summary-value" style={{ color: '#3b82f6' }}>
                {data.bySeverity.low}
              </span>
              <span className="admin-alerts__summary-label">Low</span>
            </div>
          </div>

          {data.alerts.length === 0 ? (
            <div className="admin-alerts__empty" data-testid="alerts-empty">
              <CheckCircle size={48} />
              <h2>All Systems Operational</h2>
              <p>No alerts at this time. The platform is running smoothly.</p>
              <p className="admin-alerts__empty-note">
                Alerts are generated based on quota usage, cost thresholds, and error rates.
              </p>
            </div>
          ) : (
            <div className="admin-alerts__list">
              {data.alerts.map((alert) => {
                const Icon = getAlertIcon(alert.type);
                const color = getSeverityColor(alert.severity);

                return (
                  <div
                    key={alert.id}
                    className="admin-alerts__item"
                    style={{ borderLeftColor: color }}
                    data-testid={`alert-${alert.id}`}
                  >
                    <div className="admin-alerts__item-icon" style={{ backgroundColor: `${color}20`, color }}>
                      <Icon size={20} />
                    </div>

                    <div className="admin-alerts__item-content">
                      <div className="admin-alerts__item-header">
                        <h3 className="admin-alerts__item-title">{alert.title}</h3>
                        <span
                          className="admin-alerts__item-severity"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          {alert.severity}
                        </span>
                      </div>

                      <p className="admin-alerts__item-message">{alert.message}</p>

                      <div className="admin-alerts__item-footer">
                        {alert.clientName && (
                          <Link
                            href={`/admin/clients/${alert.clientId}`}
                            className="admin-alerts__item-link"
                          >
                            View Client →
                          </Link>
                        )}
                        <span className="admin-alerts__item-time">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {loading && !data && (
        <div className="admin-loading" data-testid="admin-loading">
          Loading alerts...
        </div>
      )}

      <div className="admin-alerts__integration-note">
        <AlertCircle size={16} />
        <p>
          <strong>Monitoring Integrations:</strong> Critical alerts are automatically sent to
          Betterstack and Sentry for real-time monitoring and incident response.
        </p>
      </div>
    </div>
  );
}
