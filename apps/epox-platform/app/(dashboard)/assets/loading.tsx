import { PageHeader } from '@/components/layout';
import { AssetsListSkeleton } from '@/components/ui/skeleton-loaders';

export default function AssetsLoading() {
  return (
    <>
      <PageHeader
        title="Assets"
        description="View and manage all your generated product visualizations"
      />
      <AssetsListSkeleton />
    </>
  );
}
