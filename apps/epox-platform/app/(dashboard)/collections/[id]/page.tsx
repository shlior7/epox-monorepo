import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getServerComponentAuthRequired } from '@/lib/server/auth';
import { fetchCollectionDetail, fetchProducts } from '@/lib/server/queries';
import { CollectionDetailClient } from './collection-detail-client';

interface CollectionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { id: collectionId } = await params;
  const queryClient = getQueryClient();

  try {
    const auth = await getServerComponentAuthRequired();

    // Prefetch collection detail and products in parallel
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['collection', collectionId],
        queryFn: () => fetchCollectionDetail(auth.clientId, collectionId),
      }),
      queryClient.prefetchQuery({
        queryKey: ['products', 'all'],
        queryFn: () => fetchProducts(auth.clientId, { limit: 500 }),
      }),
    ]);
  } catch (error) {
    console.error('Collection detail prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CollectionDetailClient collectionId={collectionId} />
    </HydrationBoundary>
  );
}
