'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  FolderKanban,
  ImageIcon,
  Clock,
  ArrowRight,
  Video,
  Wand2,
  Maximize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout';
import { Skeleton } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import type { RecentAsset, RecentCollection, RecentProduct } from '@/lib/api-client';
import { CollectionThumbnailGrid } from '@/components/collections/CollectionThumbnailGrid';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'muted' | 'secondary' | 'processing' | 'success' | 'destructive';
    dot?: boolean;
  }
> = {
  draft: { label: 'Draft', variant: 'muted' },
  configured: { label: 'Ready', variant: 'secondary' },
  generating: { label: 'Generating', variant: 'processing', dot: true },
  completed: { label: 'Completed', variant: 'success' },
  error: { label: 'Error', variant: 'destructive' },
};

// Visualization types for the first section
const VISUALIZATION_TYPES = [
  {
    id: 'image',
    title: 'Image Generator',
    icon: ImageIcon,
    description: 'Generate stunning product visualizations',
    href: '/studio',
    enabled: true,
  },
  {
    id: 'video',
    title: 'Video Generator',
    icon: Video,
    description: 'Create dynamic product videos',
    href: '/studio',
    enabled: true,
  },
  {
    id: 'edit',
    title: 'Image Editor',
    icon: Wand2,
    description: 'Edit and enhance your images',
    href: '/studio',
    enabled: true,
  },
  {
    id: 'upscaler',
    title: 'Image Upscaler',
    icon: Maximize,
    description: 'Enhance image resolution',
    href: '/studio',
    enabled: true,
  },
] as const;

export function HomeClient() {
  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.getDashboard(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const recentCollections = dashboardData?.recentCollections ?? [];
  const recentAssets = dashboardData?.recentAssets ?? [];
  const recentProducts = dashboardData?.recentProducts ?? [];

  if (isLoading) {
    return (
      <>
        <PageHeader title="Home" description="Welcome back! What would you like to create today?" />
        <div className="max-w-7xl space-y-8 p-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="mx-auto mb-4 h-12 w-12" />
                <Skeleton className="mx-auto h-4 w-24" />
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Home" description="Welcome back!" />
        <div className="p-8 text-center">
          <p className="text-destructive">
            {error instanceof Error ? error.message : 'Failed to load home data'}
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Home" description="Welcome back! What would you like to create today?" />

      <div className="max-w-7xl space-y-10 p-8">
        {/* Section 1: What do you want to visualize? */}
        <section data-testid="home-visualization-types">
          <h2 className="mb-6 text-lg font-semibold">What do you want to visualize?</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {VISUALIZATION_TYPES.map((type) => (
              <Link key={type.id} href={type.href}>
                <Card
                  variant="interactive"
                  className={cn(
                    'group flex h-full flex-col items-center justify-center p-6 text-center transition-all',
                    'hover:border-primary/50 hover:bg-primary/5'
                  )}
                  data-testid={`visualization-type-${type.id}`}
                >
                  <div
                    className={cn(
                      'mb-4 flex h-14 w-14 items-center justify-center rounded-xl',
                      'bg-secondary text-secondary-foreground',
                      'transition-all duration-300',
                      'group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary'
                    )}
                  >
                    <type.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-1 font-medium transition-colors group-hover:text-primary">
                    {type.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 2: Recent Assets */}
        <section data-testid="home-recent-assets-section">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Assets</h2>
              <p className="text-sm text-muted-foreground">Your recently generated images</p>
            </div>
            <Link href="/assets">
              <Button variant="ghost" size="sm" data-testid="home-assets-view-all">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentAssets.length === 0 ? (
            <Card
              className="flex flex-col items-center justify-center p-12 text-center"
              data-testid="home-assets-empty"
            >
              <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-medium">No assets yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Start generating images to see them here
              </p>
              <Link href="/studio">
                <Button variant="outline">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Start Creating
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recentAssets.map((asset, index) => (
                <RecentAssetCard key={asset.id} asset={asset} index={index} />
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Products */}
        <section data-testid="home-products-section">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Products</h2>
              <p className="text-sm text-muted-foreground">Your product catalog</p>
            </div>
            <Link href="/products">
              <Button variant="ghost" size="sm" data-testid="home-products-view-all">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentProducts.length === 0 ? (
            <Card
              className="flex flex-col items-center justify-center p-12 text-center"
              data-testid="home-products-empty"
            >
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-medium">No products yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Import or add products to start visualizing
              </p>
              <Link href="/products">
                <Button variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Add Products
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recentProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </section>

        {/* Section 4: Collections */}
        <section data-testid="home-collections-section">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Collections</h2>
              <p className="text-sm text-muted-foreground">Your product collections</p>
            </div>
            <Link href="/collections">
              <Button variant="ghost" size="sm" data-testid="home-collections-view-all">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentCollections.length === 0 ? (
            <Card
              className="flex flex-col items-center justify-center p-12 text-center"
              data-testid="home-collections-empty"
            >
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-medium">No collections yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first collection to organize your products
              </p>
              <Link href="/collections/new">
                <Button variant="outline">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Create Collection
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recentCollections.map((collection, index) => (
                <CollectionCard key={collection.id} collection={collection} index={index} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// Product card component (simplified version of products page grid card)
function ProductCard({ product, index }: { product: RecentProduct; index: number }) {
  return (
    <Link href={`/products/${product.id}`}>
      <Card
        variant="interactive"
        className={cn(
          'group w-48 shrink-0 overflow-hidden',
          'animate-fade-in opacity-0',
          `stagger-${Math.min(index + 1, 8)}`
        )}
        data-testid={`home-product-card-${product.id}`}
      >
        {/* Product image */}
        <div className="relative aspect-square bg-white">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
              sizes="192px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="p-3">
          <p
            className="truncate text-sm font-medium"
            data-testid={`home-product-name-${product.id}`}
          >
            {product.name}
          </p>
          {product.category && (
            <Badge
              variant="muted"
              className="mt-1.5"
              data-testid={`home-product-category-${product.id}`}
            >
              {product.category}
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}

// Recent asset card component with smart routing
function RecentAssetCard({ asset, index }: { asset: RecentAsset; index: number }) {
  const subtitle = asset.productCategory || asset.sceneType;

  // Smart routing: collection studio > product studio > product detail
  const href = asset.collectionId
    ? `/studio/collections/${asset.collectionId}`
    : asset.flowId
      ? `/studio/${asset.flowId}`
      : `/products/${asset.productId}`;

  return (
    <Link href={href}>
      <Card
        variant="interactive"
        className={cn(
          'group w-64 shrink-0 overflow-hidden',
          'animate-fade-in opacity-0',
          `stagger-${Math.min(index + 1, 8)}`
        )}
        data-testid={`recent-asset-card-${asset.id}`}
      >
        {/* Product name + subtitle above */}
        <div className="border-b border-border/50 px-3 py-2">
          <p className="truncate text-sm font-medium text-foreground">{asset.productName}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-secondary">
          <Image
            src={asset.imageUrl}
            alt={`${asset.productName}${subtitle ? ` - ${subtitle}` : ''}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="256px"
          />
        </div>
      </Card>
    </Link>
  );
}

// Collection card matching the collections page style
function CollectionCard({ collection, index }: { collection: RecentCollection; index: number }) {
  return (
    <Link href={`/studio/collections/${collection.id}`}>
      <Card
        variant="interactive"
        className={cn(
          'group w-72 shrink-0 overflow-hidden p-0',
          'animate-fade-in opacity-0',
          `stagger-${Math.min(index + 1, 8)}`
        )}
        data-testid={`home-collection-card-${collection.id}`}
      >
        {/* Thumbnail grid with gradient background (matches collections page) */}
        <div
          className="relative flex h-32 items-center justify-center bg-gradient-to-br from-primary/10 via-card to-accent/10"
          data-testid={`home-collection-thumbnail-${collection.id}`}
        >
          <CollectionThumbnailGrid thumbnails={collection.thumbnails ?? []} />
        </div>

        {/* Info */}
        <div className="p-4" data-testid={`home-collection-content-${collection.id}`}>
          <div className="mb-2 flex items-start justify-between">
            <h3
              className="line-clamp-1 font-medium"
              data-testid={`home-collection-name-${collection.id}`}
            >
              {collection.name}
            </h3>
            {collection.status === 'generating' && (
              <Badge
                variant={statusConfig.generating.variant}
                dot={statusConfig.generating.dot}
                data-testid={`home-collection-status-${collection.id}`}
              >
                {statusConfig.generating.label}
              </Badge>
            )}
          </div>

          <p
            className="text-sm text-muted-foreground"
            data-testid={`home-collection-meta-${collection.id}`}
          >
            {collection.productCount} products
            {' \u2022 '}
            {collection.generatedCount > 0
              ? `${collection.generatedCount}/${collection.totalImages} images`
              : 'Not started'}
          </p>

          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(new Date(collection.updatedAt))}
          </p>
        </div>
      </Card>
    </Link>
  );
}
