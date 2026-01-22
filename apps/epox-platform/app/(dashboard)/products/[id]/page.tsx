import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getServerComponentAuthRequired } from '@/lib/server/auth';
import { fetchProductDetail } from '@/lib/server/queries';
import { ProductDetailClient } from './product-detail-client';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id: productId } = await params;
  const queryClient = getQueryClient();

  try {
    const auth = await getServerComponentAuthRequired();

    // Prefetch product detail with assets
    await queryClient.prefetchQuery({
      queryKey: ['product', productId],
      queryFn: () => fetchProductDetail(auth.clientId, productId),
    });
  } catch (error) {
    console.error('Product detail prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductDetailClient productId={productId} />
    </HydrationBoundary>
  );
}
