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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Clock,
  Download,
  Edit2,
  Eye,
  FolderKanban,
  Grid,
  Home,
  ImageIcon,
  List,
  Package,
  Pin,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { useRequiredClientId } from '../../../../lib/contexts/auth-context';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id: productId } = use(params);
  const router = useRouter();
  const clientId: string = useRequiredClientId();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  // Fetch product with assets
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => apiClient.getProduct(productId, true),
  });

  // Create studio session mutation
  const createStudioMutation = useMutation({
    mutationFn: (mode: 'generate' | 'edit') =>
      apiClient.createGenerationFlow({
        clientId,
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

  const handleStartStudio = () => {
    createStudioMutation.mutate('generate');
  };

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
  const generatedAssets = product.generatedAssets || [];
  const pinnedAssets = generatedAssets.filter((a: any) => a.isPinned);
  const approvedAssets = generatedAssets.filter((a: any) => a.approvalStatus === 'approved');

  const filteredAssets =
    activeTab === 'all' ? generatedAssets : activeTab === 'pinned' ? pinnedAssets : approvedAssets;

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" />
                  Base Images
                  {!isEditable && (
                    <Badge variant="muted" className="ml-auto text-xs">
                      Read-only
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                        className="object-cover"
                      />
                      {img.isPrimary && (
                        <Badge className="absolute left-2 top-2" variant="default">
                          Primary
                        </Badge>
                      )}
                      {isEditable && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
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
                    <button className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs">Add Image</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm">{product.description || 'No description'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium">${product.price?.toFixed(2) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{product.category}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Scene Types</p>
                  <div className="flex flex-wrap gap-1">
                    {(product.sceneTypes ?? product.sceneTypes ?? []).map((room: string) => (
                      <Badge key={room} variant="secondary">
                        <Home className="mr-1 h-3 w-3" />
                        {room}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: product.analysis.dominantColorHex }}
                      />
                      <div className="flex flex-wrap gap-1">
                        {product.analysis.colors?.map((c: string) => (
                          <Badge key={c} variant="outline">
                            {c}
                          </Badge>
                        ))}
                      </div>
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
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                  <TabsList>
                    <TabsTrigger value="all">All ({generatedAssets.length})</TabsTrigger>
                    <TabsTrigger value="pinned">
                      <Pin className="mr-1 h-3.5 w-3.5" />
                      Pinned ({pinnedAssets.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Approved ({approvedAssets.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {filteredAssets.length === 0 ? (
                  <EmptyState
                    icon={ImageIcon}
                    title={
                      activeTab === 'all' ? 'No generated images yet' : `No ${activeTab} images`
                    }
                    description={
                      activeTab === 'all'
                        ? 'Start a studio session to generate beautiful product visualizations.'
                        : `You haven't ${activeTab === 'pinned' ? 'pinned' : 'approved'} any images yet.`
                    }
                    action={
                      activeTab === 'all'
                        ? { label: 'Start Studio', onClick: handleStartStudio }
                        : undefined
                    }
                  />
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {filteredAssets.map((asset: any) => (
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

function AssetCard({
  asset,
  productName,
  onClick,
}: {
  asset: any;
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
        {asset.rating > 0 && (
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
