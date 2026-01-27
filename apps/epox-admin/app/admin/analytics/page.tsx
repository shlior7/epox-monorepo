import { BarChart3 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <div className="admin-analytics" data-testid="admin-analytics">
      <div className="admin-analytics__header">
        <div className="admin-analytics__header-icon">
          <BarChart3 size={32} />
        </div>
        <div>
          <h1 className="admin-analytics__title">Global Analytics</h1>
          <p className="admin-analytics__subtitle">Platform-wide cost and usage analysis</p>
        </div>
      </div>

      <div className="admin-analytics__placeholder">
        <BarChart3 size={48} />
        <h2>Analytics Dashboard Coming Soon</h2>
        <p>
          Global analytics with cost trends, top clients by spend, model usage breakdown, and more.
        </p>
        <p className="admin-analytics__placeholder-note">
          For now, view individual client analytics from the client detail page.
        </p>
      </div>
    </div>
  );
}
