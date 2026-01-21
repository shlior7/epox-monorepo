'use client';

import { PageHeader } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  FolderKanban,
  Loader2,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Video,
  Wand2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const STUDIO_FEATURES = [
  {
    id: 'generate-images',
    icon: Sparkles,
    title: 'Generate Product Images',
    description: 'Create stunning room visualizations for your products using AI',
    color: 'from-primary to-accent',
    action: 'Select Product',
    href: '/products',
  },
  {
    id: 'generate-video',
    icon: Video,
    title: 'Generate Product Videos',
    description: 'Create dynamic video content showcasing your products',
    color: 'from-violet-500 to-purple-600',
    action: 'Coming Soon',
    disabled: true,
  },
  {
    id: 'generate-collection',
    icon: FolderKanban,
    title: 'Generate Collection',
    description: 'Create a cohesive set of visualizations for multiple products',
    color: 'from-emerald-500 to-teal-600',
    action: 'Create Collection',
    href: '/collections/new',
  },
  {
    id: 'edit-images',
    icon: Pencil,
    title: 'Edit Product Images',
    description: 'Fine-tune base or generated images with our built-in editor',
    color: 'from-orange-500 to-amber-600',
    action: 'Select Image',
    href: '/products',
  },
];

export default function StudioPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch recent products for quick access
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', { limit: 6 }],
    queryFn: () => apiClient.getProducts({ limit: 6 }),
  });

  // Fetch recent collections
  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery({
    queryKey: ['collections', { limit: 4 }],
    queryFn: () => apiClient.getCollections({ limit: 4 }),
  });

  const recentProducts = productsData?.products || [];
  const recentCollections = collectionsData?.collections || [];

  return (
    <>
      <PageHeader title="Studio" description="Create stunning AI-powered product visualizations" />

      <div className="space-y-8 p-8">
        {/* Studio Features Grid */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">What would you like to create?</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STUDIO_FEATURES.map((feature) => (
              <Card
                key={feature.id}
                className={cn(
                  'group relative overflow-hidden transition-all',
                  feature.disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:ring-2 hover:ring-primary/50'
                )}
              >
                {/* Gradient background */}
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-5 transition-opacity',
                    `${feature.color}`,
                    !feature.disabled && 'group-hover:opacity-10'
                  )}
                />
                <CardHeader className="relative pb-2">
                  <div
                    className={cn(
                      'mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br',
                      feature.color
                    )}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="relative pt-0">
                  {feature.disabled ? (
                    <Badge variant="muted">Coming Soon</Badge>
                  ) : feature.href ? (
                    <Link href={feature.href}>
                      <Button variant="ghost" size="sm" className="group/btn -ml-2 px-2">
                        {feature.action}
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="ghost" size="sm" className="group/btn -ml-2 px-2">
                      {feature.action}
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Access: Recent Products */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quick Start with a Product</h2>
            <Link href="/products">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentProducts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">No products yet</p>
              <Link href="/products">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Products
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {recentProducts.map((product) => {
                const imageUrl =
                  product.images?.[0]?.previewUrl ||
                  product.images?.[0]?.baseUrl ||
                  product.imageUrl;
                return (
                  <Link
                    key={product.id}
                    href={`/studio/new?productId=${product.id}`}
                    className="group"
                  >
                    <Card className="overflow-hidden transition-all hover:ring-2 hover:ring-primary/50">
                      <div className="relative aspect-square bg-secondary">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button size="sm" variant="secondary">
                            <Wand2 className="mr-1 h-4 w-4" />
                            Open in Studio
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Access: Recent Collections */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Continue with a Collection</h2>
            <Link href="/collections">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoadingCollections ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentCollections.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">No collections yet</p>
              <Link href="/collections/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Collection
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentCollections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/studio/collections/${collection.id}`}
                  className="group"
                >
                  <Card className="overflow-hidden transition-all hover:ring-2 hover:ring-primary/50">
                    <div className="relative aspect-video bg-secondary">
                      {collection.thumbnailUrl ? (
                        <Image
                          src={collection.thumbnailUrl}
                          alt={collection.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FolderKanban className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {/* Status badge */}
                      <Badge
                        className="absolute right-2 top-2"
                        variant={
                          collection.status === 'completed'
                            ? 'success'
                            : collection.status === 'generating'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {collection.status}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <p className="truncate font-medium">{collection.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{collection.productCount} products</span>
                        <span>•</span>
                        <span>{collection.generatedCount} generated</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
