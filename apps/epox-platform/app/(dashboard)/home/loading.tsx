import { PageHeader } from '@/components/layout';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';

export default function DashboardLoading() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening with your visualizations."
      />
      <DashboardSkeleton />
    </>
  );
}
