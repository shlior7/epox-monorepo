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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/spinner';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  FolderKanban,
  Grid,
  List,
  Loader2,
  MoreHorizontal,
  Package,
  Play,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface CollectionDetailClientProps {
  collectionId: string;
}

export function CollectionDetailClient({ collectionId }: CollectionDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteAssetPolicy, setDeleteAssetPolicy] = useState<'delete_all' | 'keep_pinned_approved'>(
    'keep_pinned_approved'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Fetch collection - will use prefetched data if available
  const {
    data: collection,
    isLoading: isLoadingCollection,
    error: collectionError,
  } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () => apiClient.getCollection(collectionId),
    staleTime: 30 * 1000,
  });

  // Fetch all products to filter to collection's products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => apiClient.listProducts({ limit: 500 }),
    enabled: !!collection,
    staleTime: 30 * 1000,
  });

  // Filter products to only those in the collection
  const collectionProducts =
    productsData?.products.filter((p) => collection?.productIds?.includes(p.id)) || [];

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: (data: { name?: string }) => apiClient.updateCollection(collectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      toast.success('Collection updated');
      setIsEditingName(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update collection');
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: () => apiClient.deleteCollection(collectionId, { assetPolicy: deleteAssetPolicy }),
    onSuccess: () => {
      toast.success('Collection deleted');
      router.push('/collections');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete collection');
    },
  });

  const handleOpenStudio = () => {
    router.push(`/studio/collections/${collectionId}`);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== collection?.name) {
      updateCollectionMutation.mutate({ name: editedName.trim() });
    } else {
      setIsEditingName(false);
    }
  };

  const isLoading = isLoadingCollection || isLoadingProducts;

  if (isLoading) {
    return <CollectionDetailSkeleton />;
  }

  if (collectionError || !collection) {
    return (
      <div className="p-8">
        <EmptyState
          icon={FolderKanban}
          title="Collection not found"
          description="The collection you're looking for doesn't exist or has been removed."
          action={{
            label: 'Back to Collections',
            onClick: () => router.push('/collections'),
          }}
        />
      </div>
    );
  }

  const statusConfig = {
    generating: { label: 'Generating', variant: 'default' as const },
    completed: { label: 'Completed', variant: 'success' as const },
  };

  return (
    <div className="min-h-screen" data-testid="collection-detail-page">
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-border bg-card/80 px-8 py-4 backdrop-blur-xl"
        data-testid="collection-detail-header"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/collections">
              <Button variant="ghost" size="icon" testId="collection-detail-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-8 w-64"
                    autoFocus
                    testId="collection-detail-name-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <Button size="sm" onClick={handleSaveName} testId="collection-detail-save-name">
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingName(false)}
                    testId="collection-detail-cancel-edit"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold" data-testid="collection-detail-name">
                    {collection.name}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setEditedName(collection.name);
                      setIsEditingName(true);
                    }}
                    testId="collection-detail-edit-name"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                data-testid="collection-detail-meta"
              >
                {statusConfig[collection.status] && (
                  <Badge
                    variant={statusConfig[collection.status].variant}
                    testId={buildTestId('collection-detail', 'status')}
                  >
                    {statusConfig[collection.status].label}
                  </Badge>
                )}
                <span>•</span>
                <span data-testid={buildTestId('collection-detail', 'product-count')}>
                  {collection.productCount} products
                </span>
                <span>•</span>
                <span data-testid={buildTestId('collection-detail', 'generated-count')}>
                  {collection.generatedCount ?? 0}/
                  {collection.totalImages || collection.productCount} generated
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="glow"
              onClick={handleOpenStudio}
              testId="collection-detail-open-studio"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Open Studio
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" testId="collection-detail-actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" testId="collection-detail-actions-menu">
                <DropdownMenuItem
                  onClick={() => {
                    setDeleteAssetPolicy('keep_pinned_approved');
                    setIsDeleteDialogOpen(true);
                  }}
                  testId="collection-detail-delete"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                  Delete Collection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8" data-testid="collection-detail-content">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Collection Info */}
          <div className="space-y-6">
            {/* Collection Stats */}
            <Card testId="collection-detail-stats">
              <CardHeader testId={buildTestId('collection-detail-stats', 'header')}>
                <CardTitle
                  className="text-base"
                  testId={buildTestId('collection-detail-stats', 'title')}
                >
                  Collection Details
                </CardTitle>
              </CardHeader>
              <CardContent
                className="space-y-4"
                testId={buildTestId('collection-detail-stats', 'content')}
              >
                {statusConfig[collection.status] && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge
                      variant={statusConfig[collection.status].variant}
                      testId={buildTestId('collection-detail-stats', 'status')}
                    >
                      {statusConfig[collection.status].label}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Products</span>
                  <span className="font-medium">{collection.productCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Generated</span>
                  <span className="font-medium">
                    {collection.generatedCount ?? 0}/
                    {collection.totalImages || collection.productCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{formatRelativeTime(collection.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Updated</span>
                  <span className="text-sm">{formatRelativeTime(collection.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card testId="collection-detail-actions-card">
              <CardHeader testId={buildTestId('collection-detail-actions-card', 'header')}>
                <CardTitle
                  className="text-base"
                  testId={buildTestId('collection-detail-actions-card', 'title')}
                >
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent
                className="space-y-2"
                testId={buildTestId('collection-detail-actions-card', 'content')}
              >
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleOpenStudio}
                  testId={buildTestId('collection-detail-actions-card', 'open-studio')}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Open Generation Studio
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled
                  testId={buildTestId('collection-detail-actions-card', 'start-generation')}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Generation
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Products */}
          <div className="lg:col-span-2">
            <Card className="h-full" testId="collection-detail-products">
              <CardHeader testId={buildTestId('collection-detail-products', 'header')}>
                <div className="flex items-center justify-between">
                  <CardTitle
                    className="text-base"
                    testId={buildTestId('collection-detail-products', 'title')}
                  >
                    Products in Collection
                  </CardTitle>
                  <div
                    className="flex items-center gap-1 rounded-lg border p-1"
                    data-testid={buildTestId('collection-detail-products', 'view-toggle')}
                  >
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setViewMode('grid')}
                      testId={buildTestId('collection-detail-products', 'view-grid')}
                    >
                      <Grid className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setViewMode('list')}
                      testId={buildTestId('collection-detail-products', 'view-list')}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent testId={buildTestId('collection-detail-products', 'content')}>
                {collectionProducts.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No products yet"
                    description="This collection doesn't have any products. Add products to get started."
                  />
                ) : viewMode === 'grid' ? (
                  <div
                    className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
                    data-testid={buildTestId('collection-detail-products', 'grid')}
                  >
                    {collectionProducts.map((product) => {
                      const imageUrl = product.images?.[0]?.previewUrl || product.images?.[0]?.baseUrl || product.imageUrl;
                      const productTestId = buildTestId('product-card', product.id);
                      return (
                        <Link key={product.id} href={`/products/${product.id}`}>
                          <Card
                            className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50"
                            testId={productTestId}
                          >
                            <div
                              className="flex aspect-square items-center justify-center overflow-hidden bg-secondary"
                              data-testid={buildTestId(productTestId, 'image')}
                            >
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={product.name}
                                  width={200}
                                  height={200}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                            <div
                              className="p-3"
                              data-testid={buildTestId(productTestId, 'content')}
                            >
                              <p
                                className="truncate text-sm font-medium"
                                data-testid={buildTestId(productTestId, 'name')}
                              >
                                {product.name}
                              </p>
                              <p
                                className="truncate text-xs text-muted-foreground"
                                data-testid={buildTestId(productTestId, 'category')}
                              >
                                {product.category}
                              </p>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="space-y-2"
                    data-testid={buildTestId('collection-detail-products', 'list')}
                  >
                    {collectionProducts.map((product) => {
                      const imageUrl = product.images?.[0]?.previewUrl || product.images?.[0]?.baseUrl || product.imageUrl;
                      const productTestId = buildTestId('product-card', product.id);
                      return (
                        <Link key={product.id} href={`/products/${product.id}`}>
                          <div
                            className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
                            data-testid={productTestId}
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary"
                              data-testid={buildTestId(productTestId, 'image')}
                            >
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                  className="h-full w-full rounded object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div
                              className="min-w-0 flex-1"
                              data-testid={buildTestId(productTestId, 'content')}
                            >
                              <p
                                className="truncate font-medium"
                                data-testid={buildTestId(productTestId, 'name')}
                              >
                                {product.name}
                              </p>
                              <p
                                className="text-sm text-muted-foreground"
                                data-testid={buildTestId(productTestId, 'category')}
                              >
                                {product.category}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              testId={buildTestId(productTestId, 'scene-type')}
                            >
                              {(product.sceneTypes ?? product.sceneTypes)?.[0] || 'General'}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent testId="collection-delete-dialog">
          <DialogHeader testId={buildTestId('collection-delete-dialog', 'header')}>
            <DialogTitle testId={buildTestId('collection-delete-dialog', 'title')}>
              Delete Collection
            </DialogTitle>
            <DialogDescription testId={buildTestId('collection-delete-dialog', 'description')}>
              Choose what to do with assets created by "{collection.name}". This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={deleteAssetPolicy}
            onValueChange={(value) =>
              setDeleteAssetPolicy(value as 'delete_all' | 'keep_pinned_approved')
            }
            className="space-y-3"
            testId={buildTestId('collection-delete-dialog', 'options')}
          >
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <RadioGroupItem
                id="delete-collection-assets"
                value="delete_all"
                className="mt-0.5"
                testId={buildTestId('collection-delete-dialog', 'delete-all')}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="delete-collection-assets"
                  testId={buildTestId('collection-delete-dialog', 'delete-all-label')}
                >
                  Remove all assets in this collection
                </Label>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid={buildTestId('collection-delete-dialog', 'delete-all-description')}
                >
                  Deletes every generated asset owned by this collection.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <RadioGroupItem
                id="keep-collection-assets"
                value="keep_pinned_approved"
                className="mt-0.5"
                testId={buildTestId('collection-delete-dialog', 'keep-approved')}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="keep-collection-assets"
                  testId={buildTestId('collection-delete-dialog', 'keep-approved-label')}
                >
                  Keep pinned and approved assets
                </Label>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid={buildTestId('collection-delete-dialog', 'keep-approved-description')}
                >
                  Only deletes assets that are not pinned and not approved.
                </p>
              </div>
            </div>
          </RadioGroup>
          <DialogFooter testId={buildTestId('collection-delete-dialog', 'footer')}>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              testId={buildTestId('collection-delete-dialog', 'cancel')}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCollectionMutation.mutate()}
              disabled={deleteCollectionMutation.isPending}
              testId={buildTestId('collection-delete-dialog', 'confirm')}
            >
              {deleteCollectionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollectionDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 px-8 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </header>
      <div className="p-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
