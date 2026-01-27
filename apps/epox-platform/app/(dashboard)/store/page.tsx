import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getServerComponentAuthRequired } from '@/lib/server/auth';
import { StoreClient } from './store-client';

// Force dynamic rendering since auth reads headers
export const dynamic = 'force-dynamic';

export default async function StorePage() {
  const queryClient = getQueryClient();

  try {
    await getServerComponentAuthRequired();

    // Note: We don't prefetch store data here since we need to check
    // store connection status first, which is done client-side
  } catch (error) {
    console.error('Store page auth failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StoreClient />
    </HydrationBoundary>
  );
}
