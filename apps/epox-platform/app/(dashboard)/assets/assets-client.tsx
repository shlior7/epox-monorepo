'use client';

import { PageHeader } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Check,
  Clock,
  Download,
  Edit,
  Eye,
  FolderKanban,
  Grid,
  Heart,
  Images,
  List,
  Loader2,
  MoreHorizontal,
  Package,
  Pin,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface GeneratedAsset {
  id: string;
  url: string;
  productId?: string;
  productName?: string;
  flowId?: string;
  collectionId?: string;
  collectionName?: string;
  sceneType: string;
  prompt?: string;
  isPinned: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export function AssetsClient() {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);

  // Fetch all generated assets - will use prefetched data if available
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets', { sort: sortBy }],
    queryFn: () => apiClient.getGeneratedAssets({ sort: sortBy, limit: 100 }),
    staleTime: 30 * 1000,
  });

  // Fetch products for the "By Product" tab
  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 50 }],
    queryFn: () => apiClient.getProducts({ limit: 50 }),
    staleTime: 30 * 1000,
  });

  // Fetch collections for the "By Collection" tab
  const { data: collectionsData } = useQuery({
    queryKey: ['collections', { limit: 50 }],
    queryFn: () => apiClient.getCollections({ limit: 50 }),
    staleTime: 30 * 1000,
  });

  const assets = assetsData?.assets || [];
  const products = productsData?.products || [];
  const collections = collectionsData?.collections || [];

  // Filter assets by search
  const filteredAssets = searchQuery
    ? assets.filter(
        (asset: GeneratedAsset) =>
          asset.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.collectionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.sceneType?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  // Group assets by product
  const assetsByProduct = products.reduce(
    (acc, product) => {
      const productAssets = assets.filter((a: GeneratedAsset) => a.productId === product.id);
      if (productAssets.length > 0) {
        acc[product.id] = {
          product,
          assets: productAssets,
        };
      }
      return acc;
    },
    {} as Record<string, { product: (typeof products)[0]; assets: GeneratedAsset[] }>
  );

  // Group assets by collection
  const assetsByCollection = collections.reduce(
    (acc, collection) => {
      const collectionAssets = assets.filter((a: GeneratedAsset) => a.collectionId === collection.id);
      if (collectionAssets.length > 0) {
        acc[collection.id] = {
          collection,
          assets: collectionAssets,
        };
      }
      return acc;
    },
    {} as Record<string, { collection: (typeof collections)[0]; assets: GeneratedAsset[] }>
  );

  const pinnedAssets = assets.filter((a: GeneratedAsset) => a.isPinned);
  const approvedAssets = assets.filter((a: GeneratedAsset) => a.approvalStatus === 'approved');

  return (
    <>
      <PageHeader
        title="Assets"
        description="View and manage all your generated product visualizations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>
        }
      />

      <div className="p-8">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search and Filters */}
              <div className="flex flex-1 items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <SearchInput
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pinned">Pinned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
          </CardHeader>

          <CardContent className="pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  <Images className="mr-1.5 h-4 w-4" />
                  All ({assets.length})
                </TabsTrigger>
                <TabsTrigger value="by-product">
                  <Package className="mr-1.5 h-4 w-4" />
                  By Product
                </TabsTrigger>
                <TabsTrigger value="by-collection">
                  <FolderKanban className="mr-1.5 h-4 w-4" />
                  By Collection
                </TabsTrigger>
                <TabsTrigger value="pinned">
                  <Pin className="mr-1.5 h-4 w-4" />
                  Pinned ({pinnedAssets.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  <Check className="mr-1.5 h-4 w-4" />
                  Approved ({approvedAssets.length})
                </TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* All Assets Tab */}
                  <TabsContent value="all">
                    {filteredAssets.length === 0 ? (
                      <EmptyState
                        icon={Images}
                        title="No assets yet"
                        description="Generate your first product visualizations in the Studio"
                        action={{
                          label: 'Go to Studio',
                          onClick: () => (window.location.href = '/studio'),
                        }}
                      />
                    ) : viewMode === 'grid' ? (
                      <AssetGrid assets={filteredAssets} onSelect={setSelectedAsset} />
                    ) : (
                      <AssetList assets={filteredAssets} onSelect={setSelectedAsset} />
                    )}
                  </TabsContent>

                  {/* By Product Tab */}
                  <TabsContent value="by-product">
                    {Object.keys(assetsByProduct).length === 0 ? (
                      <EmptyState
                        icon={Package}
                        title="No product assets"
                        description="Generate visualizations for your products in the Studio"
                      />
                    ) : (
                      <div className="space-y-8">
                        {Object.values(assetsByProduct).map(
                          ({ product, assets: productAssets }) => (
                            <div key={product.id}>
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-secondary">
                                    {product.imageUrl ? (
                                      <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <Link
                                      href={`/products/${product.id}`}
                                      className="font-medium hover:underline"
                                    >
                                      {product.name}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                      {productAssets.length} assets
                                    </p>
                                  </div>
                                </div>
                                <Link href={`/products/${product.id}`}>
                                  <Button variant="ghost" size="sm">
                                    View Product
                                  </Button>
                                </Link>
                              </div>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                                {productAssets.slice(0, 6).map((asset: GeneratedAsset) => (
                                  <AssetThumbnail
                                    key={asset.id}
                                    asset={asset}
                                    onClick={() => setSelectedAsset(asset)}
                                  />
                                ))}
                                {productAssets.length > 6 && (
                                  <Link
                                    href={`/products/${product.id}`}
                                    className="flex aspect-square items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-muted/50"
                                  >
                                    +{productAssets.length - 6} more
                                  </Link>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* By Collection Tab */}
                  <TabsContent value="by-collection">
                    {Object.keys(assetsByCollection).length === 0 ? (
                      <EmptyState
                        icon={FolderKanban}
                        title="No collection assets"
                        description="Create a collection and generate visualizations in the Studio"
                      />
                    ) : (
                      <div className="space-y-8">
                        {Object.values(assetsByCollection).map(
                          ({ collection, assets: collectionAssets }) => (
                            <div key={collection.id}>
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-secondary">
                                    {collection.thumbnails?.[0] ? (
                                      <Image
                                        src={collection.thumbnails[0]}
                                        alt={collection.name}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center">
                                        <FolderKanban className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <Link
                                      href={`/collections/${collection.id}`}
                                      className="font-medium hover:underline"
                                    >
                                      {collection.name}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                      {collectionAssets.length} assets • {collection.productCount}{' '}
                                      products
                                    </p>
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
                              </div>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                                {collectionAssets.slice(0, 6).map((asset: GeneratedAsset) => (
                                  <AssetThumbnail
                                    key={asset.id}
                                    asset={asset}
                                    onClick={() => setSelectedAsset(asset)}
                                  />
                                ))}
                                {collectionAssets.length > 6 && (
                                  <Link
                                    href={`/collections/${collection.id}`}
                                    className="flex aspect-square items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-muted/50"
                                  >
                                    +{collectionAssets.length - 6} more
                                  </Link>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Pinned Tab */}
                  <TabsContent value="pinned">
                    {pinnedAssets.length === 0 ? (
                      <EmptyState
                        icon={Pin}
                        title="No pinned assets"
                        description="Pin your favorite visualizations to find them quickly"
                      />
                    ) : viewMode === 'grid' ? (
                      <AssetGrid assets={pinnedAssets} onSelect={setSelectedAsset} />
                    ) : (
                      <AssetList assets={pinnedAssets} onSelect={setSelectedAsset} />
                    )}
                  </TabsContent>

                  {/* Approved Tab */}
                  <TabsContent value="approved">
                    {approvedAssets.length === 0 ? (
                      <EmptyState
                        icon={Check}
                        title="No approved assets"
                        description="Approve visualizations to mark them as ready for use"
                      />
                    ) : viewMode === 'grid' ? (
                      <AssetGrid assets={approvedAssets} onSelect={setSelectedAsset} />
                    ) : (
                      <AssetList assets={approvedAssets} onSelect={setSelectedAsset} />
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Asset Preview Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Asset Preview</DialogTitle>
          {selectedAsset && (
            <div>
              <div className="relative aspect-square max-h-[60vh] overflow-hidden rounded-lg">
                <Image
                  src={selectedAsset.url}
                  alt="Asset preview"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  {selectedAsset.productName && (
                    <p className="font-medium">{selectedAsset.productName}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {selectedAsset.sceneType && <span>{selectedAsset.sceneType}</span>}
                    <span>•</span>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatRelativeTime(selectedAsset.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Pin className="mr-1 h-4 w-4" />
                    {selectedAsset.isPinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-1 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant={selectedAsset.approvalStatus === 'approved' ? 'default' : 'outline'}
                    size="sm"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    {selectedAsset.approvalStatus === 'approved' ? 'Approved' : 'Approve'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AssetGrid({
  assets,
  onSelect,
}: {
  assets: GeneratedAsset[];
  onSelect: (asset: GeneratedAsset) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {assets.map((asset) => (
        <AssetThumbnail key={asset.id} asset={asset} onClick={() => onSelect(asset)} />
      ))}
    </div>
  );
}

function AssetList({
  assets,
  onSelect,
}: {
  assets: GeneratedAsset[];
  onSelect: (asset: GeneratedAsset) => void;
}) {
  const handlePin = (asset: GeneratedAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement pin action
    console.log('Pin asset:', asset.id);
  };

  const handleFavorite = (asset: GeneratedAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement favorite action
    console.log('Favorite asset:', asset.id);
  };

  const handleApprove = (asset: GeneratedAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement approve action
    console.log('Approve asset:', asset.id);
  };

  const handleEdit = (asset: GeneratedAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement edit action
    console.log('Edit asset:', asset.id);
  };

  const handleDelete = (asset: GeneratedAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement delete action
    console.log('Delete asset:', asset.id);
  };

  return (
    <div className="divide-y divide-border">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="flex cursor-pointer items-center gap-4 py-3 transition-colors hover:bg-muted/50"
          data-testid={`asset-list-item-${asset.id}`}
        >
          <div
            className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg"
            onClick={() => onSelect(asset)}
            data-testid="asset-thumbnail"
          >
            <Image src={asset.url} alt="" fill sizes="80px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1" onClick={() => onSelect(asset)}>
            <p className="truncate font-medium" data-testid="asset-title">
              {asset.productName || 'Generated Asset'}
            </p>
            {asset.prompt && (
              <p className="truncate text-sm text-muted-foreground" data-testid="asset-subtitle">
                {asset.prompt}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {asset.isPinned && <Pin className="h-4 w-4 text-primary" data-testid="pinned-indicator" />}
            <span className="text-xs text-muted-foreground" data-testid="asset-timestamp">
              {formatRelativeTime(asset.createdAt)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="asset-actions-menu"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-testid="asset-actions-menu-content">
                <DropdownMenuItem onClick={(e) => handlePin(asset, e)} data-testid="action-pin">
                  <Pin className="mr-2 h-4 w-4" />
                  {asset.isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleFavorite(asset, e)} data-testid="action-favorite">
                  <Heart className="mr-2 h-4 w-4" />
                  Favorite
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleApprove(asset, e)}
                  disabled={asset.approvalStatus === 'approved'}
                  data-testid="action-approve"
                >
                  <Check className={`mr-2 h-4 w-4 ${asset.approvalStatus === 'approved' ? 'text-green-600' : ''}`} />
                  {asset.approvalStatus === 'approved' ? 'Approved' : 'Approve to Store'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleEdit(asset, e)} data-testid="action-edit">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => handleDelete(asset, e)}
                  className="text-destructive"
                  data-testid="action-delete"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssetThumbnail({ asset, onClick }: { asset: GeneratedAsset; onClick: () => void }) {
  return (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
      onClick={onClick}
    >
      <Image
        src={asset.url}
        alt=""
        fill
        className="object-cover transition-transform group-hover:scale-105"
      />
      {/* Status indicators */}
      <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
        {asset.isPinned && (
          <div className="rounded-full bg-primary p-1 text-primary-foreground">
            <Pin className="h-2.5 w-2.5" />
          </div>
        )}
        {asset.approvalStatus === 'approved' && (
          <div className="rounded-full bg-green-500 p-1 text-white">
            <Check className="h-2.5 w-2.5" />
          </div>
        )}
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="secondary">
          <Eye className="mr-1 h-4 w-4" />
          View
        </Button>
      </div>
    </div>
  );
}
