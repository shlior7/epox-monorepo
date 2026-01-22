import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getServerComponentAuthRequired } from '@/lib/server/auth';
import { fetchProducts } from '@/lib/server/queries';
import { ProductsClient } from './products-client';

// Force dynamic rendering since auth reads headers
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const queryClient = getQueryClient();

  try {
    const auth = await getServerComponentAuthRequired();

    // Prefetch initial products (no filters)
    await queryClient.prefetchQuery({
      queryKey: ['products', { search: '', category: 'all', source: 'all' }],
      queryFn: () => fetchProducts(auth.clientId, { limit: 100 }),
    });
  } catch (error) {
    console.error('Products prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsClient />
    </HydrationBoundary>
  );
}
