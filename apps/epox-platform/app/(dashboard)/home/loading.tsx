import { PageHeader } from '@/components/layout';
import { DashboardSkeleton } from '@/components/ui/skeleton-loaders';

export default function HomeLoading() {
  return (
    <>
      <PageHeader
        title="Home"
        description="Welcome back! What would you like to create today?"
      />
      <DashboardSkeleton />
    </>
  );
}
