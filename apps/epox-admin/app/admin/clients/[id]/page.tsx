'use client';

import { useEffect, useState, useCallback } from 'react';
import { use } from 'react';
import { ArrowLeft, Users, Package, CreditCard, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteClientModal } from '@/components/admin/DeleteClientModal';

type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

const VALID_PLANS: PlanType[] = ['free', 'starter', 'pro', 'enterprise'];

const PLAN_DEFAULTS: Record<PlanType, { monthlyGenerations: number; storageMb: number }> = {
  free: { monthlyGenerations: 100, storageMb: 1000 },
  starter: { monthlyGenerations: 500, storageMb: 5000 },
  pro: { monthlyGenerations: 2000, storageMb: 20000 },
  enterprise: { monthlyGenerations: -1, storageMb: -1 },
};

interface AuditLogEntry {
  id: string;
  clientId: string;
  adminId: string;
  action: 'plan_change' | 'credit_grant' | 'limit_change' | 'usage_reset';
  details: Record<string, unknown>;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
}

interface QuotaResponse {
  quota: {
    plan: string;
    monthlyGenerationLimit: number;
    storageQuotaMb: number;
  } | null;
  usage: {
    generationCount: number;
  } | null;
  auditLog: AuditLogEntry[];
}

interface ClientDetailResponse {
  client: {
    id: string;
    name: string;
    slug: string | null;
    logo: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user?: { name: string; email: string };
  }>;
  products: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  quota: {
    plan: string;
    monthlyGenerationLimit: number;
    storageQuotaMb: number;
  } | null;
  usage: {
    generationCount: number;
  } | null;
}

export default function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ClientDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Credit management state
  const [quotaData, setQuotaData] = useState<QuotaResponse | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [limitMonthly, setLimitMonthly] = useState<number>(100);
  const [limitStorage, setLimitStorage] = useState<number>(1000);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [creditReason, setCreditReason] = useState('');
  const [mutationLoading, setMutationLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clients/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Client not found');
        }
        throw new Error('Failed to fetch client');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotaData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/clients/${id}/quota`);
      if (response.ok) {
        const result: QuotaResponse = await response.json();
        setQuotaData(result);
        if (result.quota) {
          setSelectedPlan(result.quota.plan as PlanType);
          setLimitMonthly(result.quota.monthlyGenerationLimit);
          setLimitStorage(result.quota.storageQuotaMb);
        }
      }
    } catch {
      // Quota fetch failure is non-critical
    }
  }, [id]);

  useEffect(() => {
    if (data) {
      fetchQuotaData();
    }
  }, [data, fetchQuotaData]);

  const handleSaveQuota = async () => {
    setMutationLoading(true);
    try {
      const response = await fetch(`/api/admin/clients/${id}/quota`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          monthlyGenerationLimit: limitMonthly,
          storageQuotaMb: limitStorage,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update quota');
      }
      showFeedback('success', 'Quota updated successfully');
      await fetchClient();
      await fetchQuotaData();
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Failed to update quota');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleGrantCredits = async () => {
    if (creditAmount <= 0 || !creditReason.trim()) return;
    setMutationLoading(true);
    try {
      const response = await fetch(`/api/admin/clients/${id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant', amount: creditAmount, reason: creditReason }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to grant credits');
      }
      showFeedback('success', `Granted ${creditAmount} credits`);
      setCreditAmount(0);
      setCreditReason('');
      await fetchClient();
      await fetchQuotaData();
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Failed to grant credits');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleResetUsage = async () => {
    setMutationLoading(true);
    try {
      const response = await fetch(`/api/admin/clients/${id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', reason: 'Admin manual reset' }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to reset usage');
      }
      showFeedback('success', 'Usage reset to 0');
      setConfirmReset(false);
      await fetchClient();
      await fetchQuotaData();
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Failed to reset usage');
    } finally {
      setMutationLoading(false);
    }
  };

  const formatAuditTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 1) return `${Math.max(1, Math.round(diffMs / (1000 * 60)))}m ago`;
    if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      plan_change: 'Plan Change',
      credit_grant: 'Credit Grant',
      limit_change: 'Limit Change',
      usage_reset: 'Usage Reset',
    };
    return labels[action] || action;
  };

  const formatAuditDetails = (entry: AuditLogEntry): string => {
    const details = entry.details;
    switch (entry.action) {
      case 'plan_change': {
        let prev = '';
        let next = '';
        try { prev = JSON.parse(entry.previousValue || '{}').plan || ''; } catch { /* */ }
        try { next = JSON.parse(entry.newValue || '{}').plan || ''; } catch { /* */ }
        return prev && next ? `Changed plan from ${prev} to ${next}` : 'Plan updated';
      }
      case 'credit_grant':
        return `Granted ${(details as { amount?: number }).amount ?? '?'} credits${(details as { reason?: string }).reason ? ` — ${(details as { reason?: string }).reason}` : ''}`;
      case 'limit_change': {
        return 'Updated limits';
      }
      case 'usage_reset':
        return `Reset monthly usage to 0${(details as { reason?: string }).reason ? ` — ${(details as { reason?: string }).reason}` : ''}`;
      default:
        return JSON.stringify(details);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" data-testid="admin-loading">
        Loading client...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-client-detail" data-testid="admin-client-detail">
        <Link href="/admin/clients" className="admin-client-detail__back">
          <ArrowLeft size={18} />
          Back to Clients
        </Link>
        <div className="admin-error" data-testid="admin-error">
          {error || 'Client not found'}
        </div>
      </div>
    );
  }

  const handleDeleteClient = async () => {
    const response = await fetch(`/api/admin/clients/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete client');
    }

    // Redirect to clients list
    router.push('/admin/clients');
  };

  const usagePercentage = data.quota
    ? ((data.usage?.generationCount ?? 0) / data.quota.monthlyGenerationLimit) * 100
    : 0;

  // Calculate total generation count for stats
  const totalGenerations = data.products.reduce((sum, p) => sum, data.members.length * 10); // Placeholder

  return (
    <>
      {showDeleteModal && (
        <DeleteClientModal
          clientId={data.client.id}
          clientName={data.client.name}
          stats={{
            userCount: data.members.length,
            productCount: data.products.length,
            generationCount: totalGenerations,
          }}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteClient}
        />
      )}
    <div className="admin-client-detail" data-testid="admin-client-detail">
      <Link href="/admin/clients" className="admin-client-detail__back">
        <ArrowLeft size={18} />
        Back to Clients
      </Link>

      <div className="admin-client-detail__header">
        {data.client.logo ? (
          <img src={data.client.logo} alt={data.client.name} className="admin-client-detail__logo" />
        ) : (
          <div className="admin-client-detail__logo-placeholder">
            {data.client.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="admin-client-detail__title">{data.client.name}</h1>
          {data.client.slug && <p className="admin-client-detail__slug">{data.client.slug}</p>}
        </div>
      </div>

      <div className="admin-client-detail__grid">
        {/* Members */}
        <div className="admin-client-detail__section">
          <div className="admin-client-detail__section-header">
            <Users size={20} />
            <h2 className="admin-client-detail__section-title">Members</h2>
            <span className="admin-client-detail__section-count">{data.members.length}</span>
          </div>
          <div className="admin-client-detail__section-content">
            {data.members.length === 0 ? (
              <p className="admin-client-detail__empty">No members</p>
            ) : (
              <div className="admin-client-detail__list">
                {data.members.map((member) => (
                  <div key={member.id} className="admin-client-detail__list-item">
                    <div>
                      <p className="admin-client-detail__list-item-name">
                        {member.user?.name || 'Unknown User'}
                      </p>
                      <p className="admin-client-detail__list-item-meta">
                        {member.user?.email || member.userId}
                      </p>
                    </div>
                    <span className="admin-client-detail__badge">{member.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="admin-client-detail__section">
          <div className="admin-client-detail__section-header">
            <Package size={20} />
            <h2 className="admin-client-detail__section-title">Products</h2>
            <span className="admin-client-detail__section-count">{data.products.length}</span>
          </div>
          <div className="admin-client-detail__section-content">
            {data.products.length === 0 ? (
              <p className="admin-client-detail__empty">No products</p>
            ) : (
              <div className="admin-client-detail__list">
                {data.products.map((product) => (
                  <div key={product.id} className="admin-client-detail__list-item">
                    <div>
                      <p className="admin-client-detail__list-item-name">{product.name}</p>
                      {product.description && (
                        <p className="admin-client-detail__list-item-meta">{product.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Credit Management */}
        <div className="admin-client-detail__section admin-client-detail__section--full" data-testid="credit-management-section">
          <div className="admin-client-detail__section-header">
            <CreditCard size={20} />
            <h2 className="admin-client-detail__section-title">Credit Management</h2>
          </div>
          <div className="admin-client-detail__section-content">
            {feedback && (
              <div
                className={`admin-client-detail__credit-feedback admin-client-detail__credit-feedback--${feedback.type}`}
                data-testid="credit-feedback"
              >
                {feedback.message}
              </div>
            )}

            {/* Current Status */}
            {data.quota && (
              <div className="admin-client-detail__quota" data-testid="credit-status-display">
                <div className="admin-client-detail__quota-item">
                  <p className="admin-client-detail__quota-label">Current Plan</p>
                  <p className="admin-client-detail__quota-value">{data.quota.plan}</p>
                </div>
                <div className="admin-client-detail__quota-item">
                  <p className="admin-client-detail__quota-label">Monthly Generations</p>
                  <p className="admin-client-detail__quota-value">
                    {data.usage?.generationCount ?? 0} / {data.quota.monthlyGenerationLimit}
                  </p>
                  <div className="admin-client-detail__progress">
                    <div
                      className="admin-client-detail__progress-bar"
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="admin-client-detail__quota-meta">
                    {usagePercentage.toFixed(1)}% used &middot; {Math.max(0, (data.quota.monthlyGenerationLimit) - (data.usage?.generationCount ?? 0))} remaining
                  </p>
                </div>
                <div className="admin-client-detail__quota-item">
                  <p className="admin-client-detail__quota-label">Storage Quota</p>
                  <p className="admin-client-detail__quota-value">{data.quota.storageQuotaMb === -1 ? 'Unlimited' : `${data.quota.storageQuotaMb} MB`}</p>
                </div>
              </div>
            )}

            {/* Plan Selector & Limit Override */}
            <div className="admin-client-detail__credit-form" data-testid="quota-form">
              <h3 className="admin-client-detail__credit-form-title">Plan & Limits</h3>
              <div className="admin-client-detail__credit-row">
                <label className="admin-client-detail__credit-label">
                  Plan
                  <select
                    value={selectedPlan}
                    onChange={(e) => {
                      const plan = e.target.value as PlanType;
                      setSelectedPlan(plan);
                      const defaults = PLAN_DEFAULTS[plan];
                      setLimitMonthly(defaults.monthlyGenerations);
                      setLimitStorage(defaults.storageMb);
                    }}
                    className="admin-client-detail__credit-select"
                    data-testid="plan-selector"
                    disabled={mutationLoading}
                  >
                    {VALID_PLANS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-client-detail__credit-label">
                  Monthly Limit
                  <input
                    type="number"
                    value={limitMonthly}
                    onChange={(e) => setLimitMonthly(parseInt(e.target.value) || 0)}
                    className="admin-client-detail__credit-input"
                    data-testid="limit-monthly-input"
                    disabled={mutationLoading}
                  />
                </label>
                <label className="admin-client-detail__credit-label">
                  Storage (MB)
                  <input
                    type="number"
                    value={limitStorage}
                    onChange={(e) => setLimitStorage(parseInt(e.target.value) || 0)}
                    className="admin-client-detail__credit-input"
                    data-testid="limit-storage-input"
                    disabled={mutationLoading}
                  />
                </label>
                <button
                  onClick={handleSaveQuota}
                  disabled={mutationLoading}
                  className="admin-client-detail__credit-button"
                  data-testid="save-quota-button"
                >
                  Save Quota
                </button>
              </div>
              <p className="admin-client-detail__credit-hint">
                Defaults for {selectedPlan}: {PLAN_DEFAULTS[selectedPlan].monthlyGenerations === -1 ? 'Unlimited' : PLAN_DEFAULTS[selectedPlan].monthlyGenerations} generations, {PLAN_DEFAULTS[selectedPlan].storageMb === -1 ? 'Unlimited' : `${PLAN_DEFAULTS[selectedPlan].storageMb} MB`} storage
              </p>
            </div>

            {/* Credit Grant Form */}
            <div className="admin-client-detail__credit-form" data-testid="credit-grant-form">
              <h3 className="admin-client-detail__credit-form-title">Grant Credits</h3>
              <div className="admin-client-detail__credit-row">
                <label className="admin-client-detail__credit-label">
                  Amount
                  <input
                    type="number"
                    value={creditAmount || ''}
                    onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 500"
                    className="admin-client-detail__credit-input"
                    data-testid="credit-amount-input"
                    disabled={mutationLoading}
                    min={1}
                  />
                </label>
                <label className="admin-client-detail__credit-label admin-client-detail__credit-label--wide">
                  Reason
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="e.g. Design partner onboarding bonus"
                    className="admin-client-detail__credit-input"
                    data-testid="credit-reason-input"
                    disabled={mutationLoading}
                  />
                </label>
                <button
                  onClick={handleGrantCredits}
                  disabled={mutationLoading || creditAmount <= 0 || !creditReason.trim()}
                  className="admin-client-detail__credit-button admin-client-detail__credit-button--grant"
                  data-testid="grant-credits-button"
                >
                  <CreditCard size={16} />
                  Grant Credits
                </button>
              </div>
            </div>

            {/* Usage Reset */}
            <div className="admin-client-detail__credit-form" data-testid="usage-reset-form">
              <h3 className="admin-client-detail__credit-form-title">Reset Usage</h3>
              <div className="admin-client-detail__credit-row">
                <p className="admin-client-detail__credit-hint" style={{ margin: 0 }}>
                  Current usage: {data.usage?.generationCount ?? 0} generations this month
                </p>
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    disabled={mutationLoading || (data.usage?.generationCount ?? 0) === 0}
                    className="admin-client-detail__credit-button admin-client-detail__credit-button--reset"
                    data-testid="reset-usage-button"
                  >
                    <RefreshCw size={16} />
                    Reset Usage
                  </button>
                ) : (
                  <div className="admin-client-detail__credit-confirm">
                    <span className="admin-client-detail__credit-confirm-text">Reset usage to 0?</span>
                    <button
                      onClick={handleResetUsage}
                      disabled={mutationLoading}
                      className="admin-client-detail__credit-button admin-client-detail__credit-button--reset"
                      data-testid="confirm-reset-button"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="admin-client-detail__credit-button"
                      data-testid="cancel-reset-button"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Log */}
            <div className="admin-client-detail__credit-form" data-testid="audit-log-section">
              <h3 className="admin-client-detail__credit-form-title">Audit Log</h3>
              {(!quotaData?.auditLog || quotaData.auditLog.length === 0) ? (
                <p className="admin-client-detail__empty" data-testid="audit-log-empty">No credit management activity yet</p>
              ) : (
                <div className="admin-client-detail__audit-list">
                  {quotaData.auditLog.map((entry) => (
                    <div key={entry.id} className="admin-client-detail__audit-entry" data-testid="audit-log-entry">
                      <span className="admin-client-detail__audit-time">
                        {formatAuditTime(entry.createdAt)}
                      </span>
                      <span className={`admin-client-detail__audit-badge admin-client-detail__audit-badge--${entry.action}`}>
                        {formatActionLabel(entry.action)}
                      </span>
                      <span className="admin-client-detail__audit-details">
                        {formatAuditDetails(entry)}
                      </span>
                      <span className="admin-client-detail__audit-admin">
                        {entry.adminId}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="admin-client-detail__section admin-client-detail__section--full">
          <div className="admin-client-detail__danger-zone">
            <h3 className="admin-client-detail__danger-zone-title">Danger Zone</h3>
            <p className="admin-client-detail__danger-zone-description">
              Once you delete a client, there is no going back. All users, products, and generated
              assets will be permanently removed.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="admin-client-detail__danger-button"
              data-testid="delete-client-button"
            >
              <Trash2 size={18} />
              Delete Client
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
