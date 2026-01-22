import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getServerComponentAuthRequired } from '@/lib/server/auth';
import { fetchAssets, fetchProducts, fetchCollections } from '@/lib/server/queries';
import { AssetsClient } from './assets-client';

// Force dynamic rendering since auth reads headers
export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const queryClient = getQueryClient();

  try {
    const auth = await getServerComponentAuthRequired();

    // Prefetch assets, products, and collections in parallel
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['assets', { sort: 'recent' }],
        queryFn: () => fetchAssets(auth.clientId, { sort: 'date', limit: 100 }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['products', { limit: 50 }],
        queryFn: () => fetchProducts(auth.clientId, { limit: 50 }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['collections', { limit: 50 }],
        queryFn: () => fetchCollections(auth.clientId, { limit: 50 }),
      }),
    ]);
  } catch (error) {
    console.error('Assets prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssetsClient />
    </HydrationBoundary>
  );
}
