import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getServerComponentAuthRequired } from '@/lib/server/auth';
import { fetchDashboardData } from '@/lib/server/queries';
import { HomeClient } from './home-client';

// Force dynamic rendering since auth reads headers
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const queryClient = getQueryClient();

  // Get auth - automatically redirects to /login if not authenticated
  const auth = await getServerComponentAuthRequired();

  try {
    // Prefetch dashboard data on the server
    await queryClient.prefetchQuery({
      queryKey: ['dashboard'],
      queryFn: () => fetchDashboardData(auth.clientId),
    });
  } catch (error) {
    // Data fetch failed - client will handle loading/error states
    console.error('Home prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeClient />
    </HydrationBoundary>
  );
}
