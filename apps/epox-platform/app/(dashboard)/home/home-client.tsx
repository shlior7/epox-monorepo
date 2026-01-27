'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  FolderKanban,
  ImageIcon,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Video,
  Wand2,
  SlidersHorizontal,
  Maximize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout';
import { Skeleton } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

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
  const router = useRouter();

  // Expanded collection state
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

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
  // Note: recentAssets will be added to API in future
  const recentAssets: Array<{
    id: string;
    imageUrl: string;
    productId: string;
    productName: string;
    productCategory?: string;
    sceneType?: string;
    createdAt: string;
  }> = (dashboardData as { recentAssets?: typeof recentAssets })?.recentAssets ?? [];

  const toggleCollectionExpanded = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Home"
          description="Welcome back! What would you like to create today?"
        />
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
      <PageHeader
        title="Home"
        description="Welcome back! What would you like to create today?"
      />

      <div className="max-w-7xl space-y-10 p-8">
        {/* Section 1: What do you want to visualize? */}
        <section>
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
                >
                  <div
                    className={cn(
                      'mb-4 flex h-14 w-14 items-center justify-center rounded-xl',
                      'bg-secondary text-secondary-foreground',
                      'transition-all duration-300',
                      'group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110'
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
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Assets</h2>
              <p className="text-sm text-muted-foreground">Your recently generated images</p>
            </div>
            <Link href="/assets">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentAssets.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
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

        {/* Section 3: Collections */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Collections</h2>
              <p className="text-sm text-muted-foreground">Your product collections</p>
            </div>
            <Link href="/collections">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentCollections.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
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
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  index={index}
                  isExpanded={expandedCollections.has(collection.id)}
                  onToggleExpand={() => toggleCollectionExpanded(collection.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// Recent asset card component
function RecentAssetCard({
  asset,
  index,
}: {
  asset: {
    id: string;
    imageUrl: string;
    productId: string;
    productName: string;
    productCategory?: string;
    sceneType?: string;
    createdAt: string;
  };
  index: number;
}) {
  const subtitle = asset.productCategory || asset.sceneType;

  return (
    <Link href={`/assets/${asset.id}`}>
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
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
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

// Collection card with expandable product list
function CollectionCard({
  collection,
  index,
  isExpanded,
  onToggleExpand,
}: {
  collection: {
    id: string;
    name: string;
    status: string;
    productCount: number;
    generatedCount: number;
    thumbnailUrls?: string[];
    productNames?: string[];
    updatedAt: string;
  };
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const thumbnails = collection.thumbnailUrls ?? [];
  const productNames = collection.productNames ?? [];

  return (
    <Card
      variant="interactive"
      className={cn(
        'group w-72 shrink-0 overflow-hidden',
        'animate-fade-in opacity-0',
        `stagger-${Math.min(index + 1, 8)}`
      )}
    >
      {/* Thumbnail Grid */}
      <Link href={`/studio/collections/${collection.id}`}>
        <div className="relative aspect-video bg-secondary">
          {thumbnails.length > 0 ? (
            <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
              {thumbnails.slice(0, 4).map((url, idx) => (
                <div key={idx} className="relative h-full w-full overflow-hidden">
                  <Image
                    src={url}
                    alt={`${collection.name} thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                </div>
              ))}
              {/* Fill empty slots */}
              {thumbnails.length < 4 &&
                Array.from({ length: 4 - thumbnails.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="flex h-full w-full items-center justify-center bg-secondary"
                  >
                    <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Link
            href={`/studio/collections/${collection.id}`}
            className="truncate font-medium transition-colors hover:text-primary"
          >
            {collection.name}
          </Link>
          <Badge
            variant={statusConfig[collection.status]?.variant ?? 'muted'}
            dot={statusConfig[collection.status]?.dot}
          >
            {statusConfig[collection.status]?.label ?? collection.status}
          </Badge>
        </div>

        <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {collection.productCount} products
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatRelativeTime(new Date(collection.updatedAt))}
          </span>
        </div>

        {/* Expandable Product List */}
        {productNames.length > 0 && (
          <div>
            <button
              onClick={onToggleExpand}
              className="flex w-full items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
            >
              <span>{isExpanded ? 'Hide' : 'Show'} products</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-border/30 p-2">
                {productNames.map((name, idx) => (
                  <p key={idx} className="truncate text-xs text-muted-foreground">
                    {name}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
