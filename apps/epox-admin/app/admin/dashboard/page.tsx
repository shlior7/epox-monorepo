import { MetricCard } from '@/components/admin/MetricCard';
import { Users, Briefcase, Package, Image, DollarSign, Activity } from 'lucide-react';

interface DashboardMetrics {
  totalClients: number;
  totalUsers: number;
  totalProducts: number;
  totalGenerations: number;
  currentMonthCostUsd: number;
  activeClients: number;
}

async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/dashboard`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard metrics');
  }

  return response.json();
}

export default async function AdminDashboardPage() {
  let metrics: DashboardMetrics | null = null;
  let error: string | null = null;

  try {
    metrics = await getDashboardMetrics();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load dashboard';
  }

  if (error) {
    return (
      <div className="admin-dashboard" data-testid="admin-dashboard">
        <div className="admin-dashboard__header">
          <h1 className="admin-dashboard__title">Dashboard</h1>
          <p className="admin-dashboard__subtitle">Platform overview and metrics</p>
        </div>
        <div className="admin-error" data-testid="admin-error">
          {error}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="admin-loading" data-testid="admin-loading">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="admin-dashboard" data-testid="admin-dashboard">
      <div className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">Dashboard</h1>
        <p className="admin-dashboard__subtitle">Platform overview and metrics</p>
      </div>

      <div className="admin-dashboard__metrics">
        <MetricCard
          icon={Briefcase}
          iconVariant="accent"
          value={metrics.totalClients}
          label="Total Clients"
          testId="metric-total-clients"
        />

        <MetricCard
          icon={Users}
          iconVariant="primary"
          value={metrics.totalUsers}
          label="Total Users"
          testId="metric-total-users"
        />

        <MetricCard
          icon={Package}
          iconVariant="primary"
          value={metrics.totalProducts}
          label="Total Products"
          testId="metric-total-products"
        />

        <MetricCard
          icon={Image}
          iconVariant="success"
          value={metrics.totalGenerations}
          label="Total Generations"
          testId="metric-total-generations"
        />

        <MetricCard
          icon={DollarSign}
          iconVariant="accent"
          value={`$${metrics.currentMonthCostUsd.toFixed(2)}`}
          label="Current Month Cost"
          testId="metric-current-month-cost"
        />

        <MetricCard
          icon={Activity}
          iconVariant="success"
          value={metrics.activeClients}
          label="Active Clients (30d)"
          testId="metric-active-clients"
        />
      </div>
    </div>
  );
}
