import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getServerComponentAuthRequired } from '@/lib/server/auth';
import { fetchDashboardData } from '@/lib/server/queries';
import { DashboardClient } from './dashboard-client';

// Force dynamic rendering since auth reads headers
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  try {
    const auth = await getServerComponentAuthRequired();

    // Prefetch dashboard data on the server
    await queryClient.prefetchQuery({
      queryKey: ['dashboard'],
      queryFn: () => fetchDashboardData(auth.clientId),
    });
  } catch (error) {
    // Auth failed or data fetch failed - client will handle loading/error states
    console.error('Dashboard prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
