import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getServerComponentAuthRequired } from '@/lib/server/auth';
import { fetchCollections } from '@/lib/server/queries';
import { CollectionsClient } from './collections-client';

export default async function CollectionsPage() {
  const queryClient = getQueryClient();

  try {
    const auth = await getServerComponentAuthRequired();

    // Prefetch initial collections (no status filter)
    await queryClient.prefetchQuery({
      queryKey: ['collections', { status: 'all' }],
      queryFn: () => fetchCollections(auth.clientId, { status: 'all', limit: 50 }),
    });
  } catch (error) {
    console.error('Collections prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CollectionsClient />
    </HydrationBoundary>
  );
}
