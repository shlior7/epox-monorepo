'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient, GeneratedAsset } from '@/lib/api-client';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Clock,
  CloudUpload,
  Download,
  Edit2,
  Eye,
  Filter,
  FolderKanban,
  Grid,
  Heart,
  Home,
  ImageIcon,
  List,
  MessageSquare,
  Package,
  Pin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';
import { SCENE_TYPES } from '@/lib/constants';
import { InspirationBubblesGrid } from '@/components/studio/config-panel/InspirationBubblesGrid';
import type { BubbleValue, BubbleType, FlowGenerationSettings } from 'visualizer-types';

interface ProductDetailClientProps {
  productId: string;
}

export function ProductDetailClient({ productId }: ProductDetailClientProps) {
  const router = useRouter();
  const { clientId } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSyncedOnly, setShowSyncedOnly] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  // Fetch product with assets - will use prefetched data if available
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => apiClient.getProduct(productId, true),
    staleTime: 30 * 1000,
  });

  // Create studio session mutation
  const createStudioMutation = useMutation({
    mutationFn: (mode: 'generate' | 'edit') =>
      apiClient.createGenerationFlow({
        clientId: clientId!,
        productId: productId,
        baseImageId: product?.baseImages?.find((img: any) => img.isPrimary)?.id,
        productName: product?.name,
        mode,
      }),
    onSuccess: (data) => {
      toast.success('Studio session created!');
      router.push(`/studio/${data.id}?productId=${productId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create studio session');
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: () => apiClient.deleteProduct(productId),
    onSuccess: () => {
      toast.success('Product deleted');
      router.push('/products');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  // Upload base image mutation
  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => apiClient.uploadFile(file, 'product', { productId }),
    onSuccess: () => {
      toast.success('Image uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload image');
    },
  });

  // Set primary image mutation
  const setPrimaryImageMutation = useMutation({
    mutationFn: (imageId: string) => apiClient.setPrimaryImage(productId, imageId),
    onSuccess: () => {
      toast.success('Primary image updated');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set primary image');
    },
  });

  // Dropzone for base images
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        uploadImageMutation.mutate(file);
      });
    },
    [uploadImageMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    disabled: !product || product.source !== 'uploaded',
  });

  const handleStartStudio = () => {
    createStudioMutation.mutate('generate');
  };

  // Show loading while fetching product data
  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Package}
          title="Product not found"
          description="The product you're looking for doesn't exist or has been removed."
          action={{ label: 'Back to Products', onClick: () => router.push('/products') }}
        />
      </div>
    );
  }

  const isEditable = product.source === 'uploaded';
  const generatedAssets: GeneratedAsset[] = product.generatedAssets || [];

  // Derive unique collections from assets for dropdown
  const assetCollections = generatedAssets.reduce<Array<{ id: string; name: string }>>((acc, a) => {
    if (a.collectionId && a.collectionName && !acc.some((c) => c.id === a.collectionId)) {
      acc.push({ id: a.collectionId, name: a.collectionName });
    }
    return acc;
  }, []);

  // Counts for toggle buttons
  const favoritesCount = generatedAssets.filter((a) => a.isFavorite).length;
  const syncedCount = generatedAssets.filter((a) => a.syncedAt).length;

  // Apply all filters in sequence (AND logic)
  const filteredAssets = generatedAssets.filter((a) => {
    if (showFavoritesOnly && !a.isFavorite) return false;
    if (showSyncedOnly && !a.syncedAt) return false;
    if (selectedCollectionId && a.collectionId !== selectedCollectionId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const promptMatch = a.prompt?.toLowerCase().includes(q);
      return !!promptMatch;
    }
    return true;
  });

  const hasActiveFilters = showFavoritesOnly || showSyncedOnly || !!selectedCollectionId || !!searchQuery.trim();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 px-8 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{product.name}</h1>
                <Badge variant={product.source === 'imported' ? 'secondary' : 'outline'}>
                  {product.source === 'imported' ? 'Imported' : 'Uploaded'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                SKU: {product.sku} • {product.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && (
              <>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="glow"
              onClick={handleStartStudio}
              isLoading={createStudioMutation.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start Studio
            </Button>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Product Info */}
          <div className="space-y-6 lg:col-span-1">
            {/* Base Images */}
            <Card
              {...(isEditable ? getRootProps() : {})}
              className={cn(
                'transition-colors',
                isDragActive &&
                  isEditable &&
                  'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
            >
              {isEditable && <input {...getInputProps()} />}
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" />
                  Base Images
                  {uploadImageMutation.isPending && (
                    <Badge variant="default" className="ml-auto text-xs">
                      Uploading...
                    </Badge>
                  )}
                  {!isEditable && (
                    <Badge variant="muted" className="ml-auto text-xs">
                      Read-only
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isDragActive && isEditable ? (
                  <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 text-primary">
                    <Upload className="h-8 w-8" />
                    <span className="text-sm font-medium">Drop images here</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {product.baseImages?.map((img: any, index: number) => (
                      <div
                        key={img.id}
                        className={cn(
                          'group relative aspect-square overflow-hidden rounded-lg',
                          img.isPrimary && 'ring-2 ring-primary'
                        )}
                      >
                        <Image
                          src={img.url}
                          alt={`${product.name} - Image ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 150px"
                          className="object-cover"
                        />
                        {img.isPrimary && (
                          <Badge className="absolute left-2 top-2" variant="default">
                            Primary
                          </Badge>
                        )}
                        {isEditable && (
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            {!img.isPrimary && (
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrimaryImageMutation.mutate(img.id);
                                }}
                                disabled={setPrimaryImageMutation.isPending}
                                title="Set as Primary"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="secondary" className="h-8 w-8">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="secondary" className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {isEditable && (
                      <button
                        type="button"
                        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-xs">Add Image</span>
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Details */}
            <ProductDetailsCard
              product={product}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['product', productId] })}
            />

            {/* AI Analysis */}
            {product.analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product Type</p>
                    <p className="font-medium capitalize">{product.analysis.productType}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Materials</p>
                    <div className="flex flex-wrap gap-1">
                      {product.analysis.materials?.map((m: string) => (
                        <Badge key={m} variant="outline">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Colors</p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        // Normalize a color value to hex (handles legacy non-hex names)
                        const COLOR_NAME_TO_HEX: Record<string, string> = {
                          neutral: '#B0A899', white: '#FFFFFF', black: '#000000',
                          red: '#CC3333', blue: '#3366CC', green: '#339933',
                          yellow: '#CCCC33', orange: '#CC7733', purple: '#7733CC',
                          pink: '#CC6699', brown: '#8B4513', gray: '#808080', grey: '#808080',
                          beige: '#D4C5A9', cream: '#FFFDD0', ivory: '#FFFFF0',
                          tan: '#D2B48C', gold: '#CFB53B', silver: '#C0C0C0',
                          navy: '#001F3F', teal: '#008080', charcoal: '#36454F',
                          walnut: '#5C3317', oak: '#C19A6B', mahogany: '#4E1609',
                          espresso: '#3C1414', chocolate: '#3D1C02', taupe: '#483C32',
                          slate: '#708090', sand: '#C2B280', olive: '#556B2F',
                          rust: '#B7410E', burgundy: '#800020', maroon: '#800000',
                          coral: '#FF7F50', salmon: '#FA8072', peach: '#FFCBA4',
                          lavender: '#B57EDC', mint: '#98FB98', turquoise: '#40E0D0',
                          copper: '#B87333', natural: '#C8B88A',
                        };
                        const toHex = (c: string): string | null => {
                          const t = c.trim();
                          if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return t;
                          const mapped = COLOR_NAME_TO_HEX[t.toLowerCase()];
                          if (mapped) return mapped;
                          // partial match
                          for (const [name, hex] of Object.entries(COLOR_NAME_TO_HEX)) {
                            if (t.toLowerCase().includes(name)) return hex;
                          }
                          return null;
                        };

                        // Collect all color values from analysis
                        const rawColors: string[] = [];
                        if (product.analysis.dominantColorHex) {
                          rawColors.push(product.analysis.dominantColorHex);
                        }
                        if (Array.isArray(product.analysis.colors)) {
                          rawColors.push(...product.analysis.colors);
                        } else if (product.analysis.colors && typeof product.analysis.colors === 'object') {
                          const colorsObj = product.analysis.colors as { primary?: string; accent?: string[] };
                          if (colorsObj.primary) rawColors.push(colorsObj.primary);
                          if (Array.isArray(colorsObj.accent)) rawColors.push(...colorsObj.accent);
                        }

                        // Normalize and deduplicate
                        const hexColors = rawColors.map(toHex).filter((c): c is string => c !== null);
                        const uniqueColors = [...new Set(hexColors)];

                        return uniqueColors.length > 0 ? (
                          <div className="flex gap-1.5">
                            {uniqueColors.map((c) => (
                              <div
                                key={c}
                                className="h-6 w-6 rounded-full border border-border"
                                style={{ backgroundColor: c }}
                                title={c}
                                data-testid={`product-detail-color-${c}`}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No colors detected</span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Style</p>
                    <div className="flex flex-wrap gap-1">
                      {product.analysis.style?.map((s: string) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Default Generation Settings */}
            <DefaultGenerationSettingsCard
              product={product}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['product', productId] })}
            />

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generation Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{product.stats?.totalGenerated || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Generated</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{product.stats?.approvedCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{product.stats?.pinnedCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Pinned</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{product.stats?.pendingCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="h-4 w-4" />
                  Collections
                  <Badge variant="muted" className="ml-auto">
                    {product.collections?.length || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {product.collections && product.collections.length > 0 ? (
                  <div className="space-y-2">
                    {product.collections.map((collection: any) => (
                      <Link
                        key={collection.id}
                        href={`/collections/${collection.id}`}
                        className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{collection.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{collection.productCount} products</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(collection.updatedAt)}</span>
                          </div>
                        </div>
                        <Badge
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
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <FolderKanban className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Not in any collections</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => router.push('/collections/new')}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add to Collection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Generated Assets */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Generated Assets</CardTitle>
                  <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 rounded-lg border p-1">
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Filter Bar */}
                <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="asset-filter-bar">
                  {/* Favorites Toggle */}
                  <Button
                    variant={showFavoritesOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowFavoritesOnly((v) => !v)}
                    data-testid="filter-favorites"
                  >
                    <Heart className={cn('mr-1.5 h-3.5 w-3.5', showFavoritesOnly && 'fill-current')} />
                    Favorites{favoritesCount > 0 ? ` (${favoritesCount})` : ''}
                  </Button>

                  {/* Uploaded to Store Toggle */}
                  <Button
                    variant={showSyncedOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowSyncedOnly((v) => !v)}
                    data-testid="filter-uploaded"
                  >
                    <CloudUpload className="mr-1.5 h-3.5 w-3.5" />
                    Uploaded{syncedCount > 0 ? ` (${syncedCount})` : ''}
                  </Button>

                  {/* Collection Filter Dropdown */}
                  {assetCollections.length > 0 && (
                    <Select
                      value={selectedCollectionId ?? 'all'}
                      onValueChange={(v) => setSelectedCollectionId(v === 'all' ? null : v)}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-sm" data-testid="filter-collection">
                        <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        <SelectValue placeholder="Collection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Collections</SelectItem>
                        {assetCollections.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Search by Prompt */}
                  <div className="relative" data-testid="filter-search">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search prompts..."
                      className="h-8 w-[200px] pl-8 text-sm"
                    />
                  </div>

                  {/* Clear All Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowFavoritesOnly(false);
                        setShowSyncedOnly(false);
                        setSelectedCollectionId(null);
                        setSearchQuery('');
                      }}
                      data-testid="filter-clear"
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredAssets.length === 0 ? (
                  <EmptyState
                    icon={ImageIcon}
                    title={
                      hasActiveFilters ? 'No matching images' : 'No generated images yet'
                    }
                    description={
                      hasActiveFilters
                        ? 'Try adjusting your filters to see more results.'
                        : 'Start a studio session to generate beautiful product visualizations.'
                    }
                    action={
                      hasActiveFilters
                        ? undefined
                        : { label: 'Start Studio', onClick: handleStartStudio }
                    }
                  />
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {filteredAssets.map((asset: GeneratedAsset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        productName={product.name}
                        onClick={() => setSelectedImage(asset)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredAssets.map((asset: any) => (
                      <AssetListItem
                        key={asset.id}
                        asset={asset}
                        productName={product.name}
                        onClick={() => setSelectedImage(asset)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditProductDialog
        product={product}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['product', productId] });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{product.name}"? This action cannot be undone. All
              generated assets will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProductMutation.mutate()}
              isLoading={deleteProductMutation.isPending}
            >
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      {selectedImage && (
        <ImagePreviewDialog
          image={selectedImage}
          productName={product.name}
          open={!!selectedImage}
          onOpenChange={(open) => !open && setSelectedImage(null)}
        />
      )}
    </div>
  );
}

// ===== EDITABLE TAGS INPUT =====

function EditableTagsField({
  label,
  tags,
  suggestions,
  onTagsChange,
}: {
  label: string;
  tags: string[];
  suggestions: readonly string[] | string[];
  onTagsChange: (tags: string[]) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const unusedSuggestions = (suggestions as string[]).filter((s) => !tags.includes(s));

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
  };

  const removeTag = (index: number) => {
    const next = [...tags];
    next.splice(index, 1);
    onTagsChange(next);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      addTag(customValue);
      setCustomValue('');
    }
  };

  return (
    <div data-testid={`editable-tags-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="mb-2 text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1" data-testid={`tag-${tag}`}>
            <Home className="h-3 w-3" />
            {tag}
            <button
              onClick={() => removeTag(i)}
              className="ml-0.5 rounded-full p-0.5 opacity-50 transition-opacity hover:bg-destructive/20 hover:opacity-100"
              data-testid={`tag-remove-${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            data-testid={`tag-add-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit();
                if (e.key === 'Escape') { setIsAdding(false); setCustomValue(''); }
              }}
              placeholder="Type custom..."
              className="w-24 rounded-md border border-border bg-background px-2 py-0.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid={`tag-custom-input-${label.toLowerCase().replace(/\s+/g, '-')}`}
            />
            <button
              onClick={() => { setIsAdding(false); setCustomValue(''); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {/* Suggestions */}
      {isAdding && unusedSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1" data-testid={`tag-suggestions-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {unusedSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground"
              data-testid={`tag-suggestion-${suggestion}`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== EDITABLE CATEGORIES (multi-select with API) =====

function EditableCategoriesField({
  productId,
  linkedCategories,
  primaryCategory,
  onSaved,
}: {
  productId: string;
  linkedCategories: Array<{ categoryId: string; categoryName: string; isPrimary: boolean }>;
  primaryCategory: string;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all available categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) return { categories: [] };
      return res.json() as Promise<{ categories: Array<{ id: string; name: string }> }>;
    },
    staleTime: 60 * 1000,
  });

  const allCategories = categoriesData?.categories || [];
  const linkedIds = new Set(linkedCategories.map((lc) => lc.categoryId));

  // Filter suggestions: not already linked, and matching search
  const unusedCategories = allCategories.filter(
    (c) => !linkedIds.has(c.id) &&
      (!customValue || c.name.toLowerCase().includes(customValue.toLowerCase()))
  );

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const addCategoryById = async (categoryId: string) => {
    setIsSaving(true);
    try {
      await fetch(`/api/products/${productId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId }),
      });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
      onSaved();
    } catch {
      toast.error('Failed to add category');
    } finally {
      setIsSaving(false);
    }
  };

  const addCategoryByName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check if it already exists
    const existing = allCategories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      await addCategoryById(existing.id);
      setCustomValue('');
      return;
    }

    // Create new category, then link it
    setIsSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error('Failed to create category');
      const { category: newCat } = await res.json();
      await fetch(`/api/products/${productId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: newCat.id }),
      });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
      setCustomValue('');
      onSaved();
    } catch {
      toast.error('Failed to create category');
    } finally {
      setIsSaving(false);
    }
  };

  const removeCategory = async (categoryId: string) => {
    const remaining = linkedCategories.filter((lc) => lc.categoryId !== categoryId);
    setIsSaving(true);
    try {
      await fetch(`/api/products/${productId}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryIds: remaining.map((lc) => lc.categoryId),
          primaryCategoryId: remaining.find((lc) => lc.isPrimary)?.categoryId || remaining[0]?.categoryId,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      onSaved();
    } catch {
      toast.error('Failed to remove category');
    } finally {
      setIsSaving(false);
    }
  };

  // Combine primary category text with linked categories for display
  const displayCategories = linkedCategories.length > 0
    ? linkedCategories
    : primaryCategory
      ? [{ categoryId: '_primary', categoryName: primaryCategory, isPrimary: true }]
      : [];

  return (
    <div data-testid="editable-categories-field">
      <p className="mb-2 text-sm text-muted-foreground">Categories</p>
      <div className="flex flex-wrap gap-1.5">
        {displayCategories.map((lc) => (
          <Badge
            key={lc.categoryId}
            variant={lc.isPrimary ? 'default' : 'secondary'}
            className="gap-1 pr-1"
            data-testid={`category-tag-${lc.categoryName}`}
          >
            {lc.categoryName}
            {lc.categoryId !== '_primary' && (
              <button
                onClick={() => removeCategory(lc.categoryId)}
                disabled={isSaving}
                className="ml-0.5 rounded-full p-0.5 opacity-50 transition-opacity hover:bg-destructive/20 hover:opacity-100"
                data-testid={`category-remove-${lc.categoryName}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            data-testid="category-add-btn"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCategoryByName(customValue);
                if (e.key === 'Escape') { setIsAdding(false); setCustomValue(''); }
              }}
              placeholder="Type category..."
              disabled={isSaving}
              className="w-28 rounded-md border border-border bg-background px-2 py-0.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="category-custom-input"
            />
            <button
              onClick={() => { setIsAdding(false); setCustomValue(''); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {/* Suggestions */}
      {isAdding && unusedCategories.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1" data-testid="category-suggestions">
          {unusedCategories.slice(0, 8).map((cat) => (
            <button
              key={cat.id}
              onClick={() => addCategoryById(cat.id)}
              disabled={isSaving}
              className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground"
              data-testid={`category-suggestion-${cat.name}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== PRODUCT DETAILS CARD =====

function ProductDetailsCard({
  product,
  onSaved,
}: {
  product: any;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [sceneTypes, setSceneTypes] = useState<string[]>(product.sceneTypes || []);
  const [isSaving, setIsSaving] = useState(false);

  const sceneTypesChanged =
    JSON.stringify(sceneTypes) !== JSON.stringify(product.sceneTypes || []);

  const handleSaveSceneTypes = async () => {
    setIsSaving(true);
    try {
      await apiClient.updateProduct(product.id, { sceneTypes });
      toast.success('Scene types updated');
      onSaved();
    } catch {
      toast.error('Failed to update scene types');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card data-testid="product-details-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Details
          {sceneTypesChanged && (
            <Button
              variant="glow"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={handleSaveSceneTypes}
              isLoading={isSaving}
              data-testid="product-details-save"
            >
              <Save className="mr-1 h-3 w-3" />
              Save
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Description</p>
          <p className="mt-1 text-sm">{product.description || 'No description'}</p>
        </div>
        <EditableCategoriesField
          productId={product.id}
          linkedCategories={product.linkedCategories || []}
          primaryCategory={product.category || ''}
          onSaved={onSaved}
        />
        <EditableTagsField
          label="Scene Types"
          tags={sceneTypes}
          suggestions={SCENE_TYPES}
          onTagsChange={setSceneTypes}
        />
      </CardContent>
    </Card>
  );
}

// ===== DEFAULT GENERATION SETTINGS CARD =====

function DefaultGenerationSettingsCard({
  product,
  onSaved,
}: {
  product: any;
  onSaved: () => void;
}) {
  const settings: FlowGenerationSettings | null = product.defaultGenerationSettings || null;
  const [isEditing, setIsEditing] = useState(false);
  const [bubbles, setBubbles] = useState<BubbleValue[]>(settings?.generalInspiration || []);
  const [userPrompt, setUserPrompt] = useState(settings?.userPrompt || '');
  const [isSaving, setIsSaving] = useState(false);

  const hasContent = bubbles.length > 0 || userPrompt.trim().length > 0;
  const originalBubbles = settings?.generalInspiration || [];
  const originalPrompt = settings?.userPrompt || '';
  const hasChanges =
    JSON.stringify(bubbles) !== JSON.stringify(originalBubbles) ||
    userPrompt !== originalPrompt;

  const handleAddBubble = useCallback((type: BubbleType) => {
    setBubbles((prev) => [...prev, { type } as BubbleValue]);
  }, []);

  const handleRemoveBubble = useCallback((_index: number) => {
    setBubbles((prev) => {
      const next = [...prev];
      next.splice(_index, 1);
      return next;
    });
  }, []);

  const handleUpdateBubble = useCallback((index: number, bubble: BubbleValue) => {
    setBubbles((prev) => {
      const next = [...prev];
      next[index] = bubble;
      return next;
    });
  }, []);

  const handleAddMultipleBubbles = useCallback((newBubbles: BubbleValue[]) => {
    setBubbles((prev) => [...prev, ...newBubbles]);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newSettings: FlowGenerationSettings = {
        ...(settings || {}),
        aspectRatio: settings?.aspectRatio || '1:1',
        generalInspiration: bubbles,
        userPrompt: userPrompt.trim() || undefined,
      };
      await apiClient.updateProduct(product.id, {
        defaultGenerationSettings: newSettings,
      });
      toast.success('Generation settings saved');
      setIsEditing(false);
      onSaved();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const sceneType = product.sceneTypes?.[0] || 'General';

  return (
    <Card data-testid="product-gen-settings-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4" />
          Default Settings
          <div className="ml-auto flex items-center gap-1">
            {isEditing && hasChanges && (
              <Button
                variant="glow"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSave}
                isLoading={isSaving}
                data-testid="product-gen-settings-save"
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
            )}
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsEditing(true)}
                data-testid="product-gen-settings-edit"
              >
                <Edit2 className="mr-1 h-3 w-3" />
                Edit
              </Button>
            )}
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setBubbles(originalBubbles);
                  setUserPrompt(originalPrompt);
                  setIsEditing(false);
                }}
                data-testid="product-gen-settings-cancel"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing && !hasContent ? (
          <div className="py-3 text-center" data-testid="product-gen-settings-empty">
            <Settings2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No default settings configured</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setIsEditing(true)}
              data-testid="product-gen-settings-configure"
            >
              <Plus className="mr-1 h-3 w-3" />
              Configure Defaults
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Default Prompt */}
            <div data-testid="product-gen-settings-prompt-section">
              <p className="mb-1.5 text-sm text-muted-foreground">
                <MessageSquare className="mr-1 inline h-3.5 w-3.5" />
                Default Prompt
              </p>
              {isEditing ? (
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Describe how you want this product visualized..."
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="product-gen-settings-prompt-input"
                />
              ) : (
                <p className="text-sm" data-testid="product-gen-settings-prompt-display">
                  {userPrompt || <span className="text-muted-foreground">No default prompt</span>}
                </p>
              )}
            </div>

            {/* Inspiration Bubbles */}
            {isEditing ? (
              <InspirationBubblesGrid
                bubbles={bubbles}
                sceneType={sceneType}
                headerLabel="Inspiration"
                onAddBubble={handleAddBubble}
                onRemoveBubble={handleRemoveBubble}
                onUpdateBubble={handleUpdateBubble}
                onAddMultipleBubbles={handleAddMultipleBubbles}
                maxBubbles={6}
                columns={3}
                compact
              />
            ) : bubbles.length > 0 ? (
              <div data-testid="product-gen-settings-bubbles-display">
                <p className="mb-2 text-sm text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                  Inspiration ({bubbles.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bubbles.map((b, i) => (
                    <Badge key={i} variant="secondary" className="text-xs" data-testid={`gen-bubble-${i}`}>
                      {(b as any).label || b.type}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== ASSET CARDS =====

function AssetCard({
  asset,
  productName,
  onClick,
}: {
  asset: GeneratedAsset;
  productName: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50"
      onClick={onClick}
    >
      <div className="relative aspect-square">
        <Image
          src={asset.url}
          alt={`${productName} - ${asset.sceneType}`}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 200px"
          className="object-cover"
        />
        {/* Badges */}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          {asset.isPinned && (
            <div className="rounded-full bg-primary p-1 text-primary-foreground">
              <Pin className="h-3 w-3" />
            </div>
          )}
          {asset.approvalStatus === 'approved' && (
            <div className="rounded-full bg-green-500 p-1 text-white">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
        {/* Rating */}
        {asset.rating && asset.rating > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-0.5">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-white">{asset.rating}</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="sm" variant="secondary">
            <Eye className="mr-1 h-4 w-4" />
            View
          </Button>
        </div>
      </div>
      <div className="p-2">
        <p className="text-xs text-muted-foreground">{asset.sceneType}</p>
      </div>
    </Card>
  );
}

function AssetListItem({
  asset,
  productName,
  onClick,
}: {
  asset: any;
  productName: string;
  onClick: () => void;
}) {
  return (
    <div
      className="flex cursor-pointer items-center gap-4 p-3 transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
        <Image
          src={asset.url}
          alt={`${productName} - ${asset.sceneType}`}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{asset.sceneType}</p>
        <p className="text-sm text-muted-foreground">{formatRelativeTime(asset.createdAt)}</p>
      </div>
      <div className="flex items-center gap-2">
        {asset.isPinned && <Pin className="h-4 w-4 text-primary" />}
        {asset.rating > 0 && (
          <div className="flex items-center gap-0.5">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm">{asset.rating}</span>
          </div>
        )}
        <Badge
          variant={
            asset.approvalStatus === 'approved'
              ? 'success'
              : asset.approvalStatus === 'rejected'
                ? 'destructive'
                : 'muted'
          }
        >
          {asset.approvalStatus}
        </Badge>
      </div>
    </div>
  );
}

function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSave,
}: {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product.name,
    sku: product.sku,
    description: product.description || '',
    price: product.price?.toString() || '',
    category: product.category,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.updateProduct(product.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price) || 0,
      });
      toast.success('Product updated');
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">SKU</label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Price</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImagePreviewDialog({
  image,
  productName,
  open,
  onOpenChange,
}: {
  image: any;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <div className="relative aspect-square max-h-[70vh] overflow-hidden rounded-lg">
          <Image
            src={image.url}
            alt={`${productName} - ${image.sceneType}`}
            fill
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-contain"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{image.sceneType}</p>
            <p className="text-sm text-muted-foreground">{formatRelativeTime(image.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Pin className="mr-1 h-4 w-4" />
              {image.isPinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-1 h-4 w-4" />
              Regenerate
            </Button>
            <Button variant={image.approvalStatus === 'approved' ? 'default' : 'outline'} size="sm">
              <Check className="mr-1 h-4 w-4" />
              {image.approvalStatus === 'approved' ? 'Approved' : 'Approve'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-8 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-32" />
          </div>
        </div>
      </header>
      <div className="p-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="mb-4 h-5 w-32" />
                <Skeleton className="h-40 w-full" />
              </Card>
            ))}
          </div>
          <div className="lg:col-span-2">
            <Card className="p-6">
              <Skeleton className="mb-6 h-6 w-40" />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
