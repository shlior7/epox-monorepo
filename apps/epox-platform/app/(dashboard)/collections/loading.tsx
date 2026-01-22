import { PageHeader } from '@/components/layout';
import { CollectionsListSkeleton } from '@/components/ui/skeleton-loaders';

export default function CollectionsLoading() {
  return (
    <>
      <PageHeader title="Collections" description="Manage your generation collections" />
      <CollectionsListSkeleton />
    </>
  );
}
