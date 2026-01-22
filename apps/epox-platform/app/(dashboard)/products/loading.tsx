import { PageHeader } from '@/components/layout';
import { ProductsListSkeleton } from '@/components/ui/skeleton-loaders';

export default function ProductsLoading() {
  return (
    <>
      <PageHeader title="Products" description="Manage your product catalog" />
      <ProductsListSkeleton />
    </>
  );
}
