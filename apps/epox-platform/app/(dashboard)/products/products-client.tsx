'use client';

import React, { useState, Suspense, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Upload,
  Store,
  Package,
  MoreVertical,
  Star,
  StarOff,
  Trash2,
  ExternalLink,
  Filter,
  LayoutGrid,
  Rows3,
  Check,
  X,
  Download,
  Heart,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/layout';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useModal } from '@/lib/hooks/use-modal';
import { buildTestId } from '@/lib/testing/testid';
import { toast } from 'sonner';
import type { Product } from '@/lib/api-client';
import { ImportProductsModal } from '@/components/store/modals/ImportProductsModal';

type ViewMode = 'table' | 'grid';

function ProductsPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const { openModal, closeModal, isOpen } = useModal();

  // Fetch products - will use prefetched data if available
  const {
    data: productsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products', { search: searchQuery, category: categoryFilter, source: sourceFilter }],
    queryFn: () =>
      apiClient.listProducts({
        search: searchQuery || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        source: sourceFilter !== 'all' ? (sourceFilter as 'imported' | 'uploaded') : undefined,
        limit: 100,
      }),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const products = productsData?.products ?? [];
  const categories = productsData?.filters?.categories ?? [];
  const sceneTypes = productsData?.filters?.sceneTypes ?? [];

  // Fetch store connection status
  const { data: storeStatus } = useQuery({
    queryKey: ['store-connection-status'],
    queryFn: () => apiClient.getStoreConnectionStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter products client-side for "show selected only"
  const filteredProducts = useMemo(() => {
    if (showSelectedOnly && selectedProductIds.length > 0) {
      return products.filter((p) => selectedProductIds.includes(p.id));
    }
    return products;
  }, [products, showSelectedOnly, selectedProductIds]);

  // Delete mutation (single product)
  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiClient.deleteProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      setSelectedProductIds((prev) => prev.filter((id) => id !== productToDelete));
      setProductToDelete(null);
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to delete product');
      console.error('Failed to delete product:', error);
    },
  });

  // Bulk delete mutation (multiple products)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      await Promise.all(productIds.map((id) => apiClient.deleteProduct(id)));
    },
    onSuccess: (_, productIds) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${productIds.length} products deleted successfully`);
      setSelectedProductIds([]);
      setProductsToDelete([]);
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to delete products');
      console.error('Failed to delete products:', error);
    },
  });

  // Scene type update mutation with optimistic updates
  const handleSceneTypeChange = async (productId: string, sceneType: string) => {
    const updateProductData = (old: any) => {
      if (!old) return old;
      if (old.products) {
        return {
          ...old,
          products: old.products.map((p: any) =>
            p.id === productId ? { ...p, selectedSceneType: sceneType } : p
          ),
        };
      }
      if (Array.isArray(old)) {
        return old.map((p: any) =>
          p.id === productId ? { ...p, selectedSceneType: sceneType } : p
        );
      }
      return old;
    };

    queryClient.setQueryData(['products', { search: searchQuery, category: categoryFilter, source: sourceFilter }], updateProductData);

    try {
      await apiClient.updateProduct(productId, { selectedSceneType: sceneType });
      toast.success('Scene type updated');
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.error('Failed to update scene type');
      console.error('Failed to update scene type:', error);
    }
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setProductsToDelete([]);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (productsToDelete.length > 0) {
      bulkDeleteMutation.mutate(productsToDelete);
    } else if (productToDelete) {
      deleteMutation.mutate(productToDelete);
    }
  };

  const toggleProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((i) => i !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
    setShowSelectedOnly(false);
  };

  const handleDownloadSelected = () => {
    toast.info('Download functionality coming soon');
  };

  const handlePinSelected = () => {
    toast.info('Pin functionality coming soon');
  };

  const handleApproveSelected = () => {
    toast.info('Approve functionality coming soon');
  };

  const handleDeleteSelected = () => {
    if (selectedProductIds.length > 0) {
      setProductToDelete(null);
      setProductsToDelete(selectedProductIds);
      setDeleteDialogOpen(true);
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        testId="products-header"
        actions={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glow" testId="products-add-button">
                <Plus className="mr-2 h-4 w-4" />
                Add Products
              </Button>
            </DialogTrigger>
            <DialogContent testId="products-add-dialog">
              <DialogHeader testId={buildTestId('products-add-dialog', 'header')}>
                <DialogTitle testId={buildTestId('products-add-dialog', 'title')}>
                  Add Products
                </DialogTitle>
                <DialogDescription testId={buildTestId('products-add-dialog', 'description')}>
                  Choose how you want to add products to your catalog.
                </DialogDescription>
              </DialogHeader>
              <div
                className="grid gap-4 py-4"
                data-testid={buildTestId('products-add-dialog', 'actions')}
              >
                <Button
                  variant="outline"
                  className="h-auto justify-start p-4"
                  onClick={() => {
                    setAddDialogOpen(false);
                    // Check if store is connected
                    if (storeStatus?.connected) {
                      // Store is connected, open import modal
                      openModal('import-products');
                    } else {
                      // No store connected, route to store page
                      router.push('/store');
                    }
                  }}
                  testId={buildTestId('products-add-dialog', 'import-store')}
                >
                  <Store className="mr-4 h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Import from Store</p>
                    <p className="text-sm text-muted-foreground">
                      {storeStatus?.connected
                        ? `Import from ${storeStatus.connection?.storeName || 'your store'}`
                        : 'Connect Shopify, WooCommerce, or other platforms'
                      }
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start p-4"
                  onClick={() => {
                    setAddDialogOpen(false);
                    openModal('add-product');
                  }}
                  testId={buildTestId('products-add-dialog', 'upload-manual')}
                >
                  <Upload className="mr-4 h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Upload Manually</p>
                    <p className="text-sm text-muted-foreground">
                      Add products with images and details
                    </p>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-8" data-testid="products-page">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" data-testid="products-filters">
          <div className="flex flex-col gap-4 sm:flex-row">
            <SearchInput
              placeholder="Search products..."
              className="sm:w-80"
              value={searchQuery}
              onSearch={setSearchQuery}
              testId="products-search"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40" testId="products-category-trigger">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent testId="products-category-content">
                <SelectItem value="all" testId={buildTestId('products-category', 'all')}>
                  All Categories
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} testId={buildTestId('products-category', cat)}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40" testId="products-source-trigger">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent testId="products-source-content">
                <SelectItem value="all" testId={buildTestId('products-source', 'all')}>
                  All Sources
                </SelectItem>
                <SelectItem value="imported" testId={buildTestId('products-source', 'imported')}>
                  Imported
                </SelectItem>
                <SelectItem value="uploaded" testId={buildTestId('products-source', 'uploaded')}>
                  Uploaded
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border p-1" data-testid="products-view-toggle">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
              title="Table view"
              testId="products-view-table"
            >
              <Rows3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
              title="Grid view"
              testId="products-view-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <Card testId="products-card">
          {isLoading ? (
            <div className="p-8" data-testid="products-loading">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" testId={buildTestId('products-loading', `item-${i}`, 'image')} />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" testId={buildTestId('products-loading', `item-${i}`, 'title')} />
                      <Skeleton className="h-3 w-24" testId={buildTestId('products-loading', `item-${i}`, 'subtitle')} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="py-12 text-center" data-testid="products-error">
              <p className="mb-4 text-destructive" data-testid={buildTestId('products-error', 'message')}>
                {error instanceof Error ? error.message : 'Failed to load products'}
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                testId={buildTestId('products-error', 'retry')}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <div className="overflow-x-auto" data-testid="products-table">
                  <table className="w-full" data-testid={buildTestId('products-table', 'table')}>
                    <thead>
                      <tr className="border-b border-border">
                        <th className="w-12 p-4" data-testid={buildTestId('products-table', 'header', 'checkbox')}>
                          <div className="flex items-center justify-center">
                            <div
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded border-2 transition-all cursor-pointer',
                                selectedProductIds.length > 0
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40 hover:border-primary'
                              )}
                              onClick={() => {
                                if (selectedProductIds.length > 0) {
                                  setSelectedProductIds([]);
                                } else {
                                  setSelectedProductIds(filteredProducts.map((p) => p.id));
                                }
                              }}
                            >
                              {selectedProductIds.length > 0 && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        </th>
                        <th
                          className="p-4 text-left font-medium text-muted-foreground"
                          data-testid={buildTestId('products-table', 'header', 'product')}
                        >
                          Product
                        </th>
                        <th
                          className="p-4 text-left font-medium text-muted-foreground"
                          data-testid={buildTestId('products-table', 'header', 'sku')}
                        >
                          SKU
                        </th>
                        <th
                          className="p-4 text-left font-medium text-muted-foreground"
                          data-testid={buildTestId('products-table', 'header', 'category')}
                        >
                          Category
                        </th>
                        <th
                          className="p-4 text-left font-medium text-muted-foreground"
                          data-testid={buildTestId('products-table', 'header', 'scene-types')}
                        >
                          Scene Types
                        </th>
                        <th
                          className="p-4 text-left font-medium text-muted-foreground"
                          data-testid={buildTestId('products-table', 'header', 'source')}
                        >
                          Source
                        </th>
                        <th
                          className="p-4 text-right font-medium text-muted-foreground"
                          data-testid={buildTestId('products-table', 'header', 'actions')}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product, index) => {
                        const productImageUrl = product.images?.[0]?.baseUrl || product.imageUrl;
                        const productTestId = buildTestId('product-card', product.id);
                        const isSelected = selectedProductIds.includes(product.id);
                        const availableSceneTypes = Array.from(
                          new Set([...(product.sceneTypes || []), ...sceneTypes])
                        ).sort();

                        return (
                          <tr
                            key={product.id}
                            className={cn(
                              'cursor-pointer border-b border-border transition-colors hover:bg-secondary/30',
                              'animate-fade-in opacity-0',
                              `stagger-${Math.min(index + 1, 6)}`,
                              isSelected && 'bg-primary/5'
                            )}
                            data-testid={productTestId}
                          >
                            <td className="p-4" data-testid={buildTestId(productTestId, 'checkbox')}>
                              <div
                                className="flex items-center justify-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProduct(product.id);
                                }}
                              >
                                <div
                                  className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                    isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-muted-foreground/40 hover:border-primary'
                                  )}
                                  data-testid={buildTestId(productTestId, 'select')}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                              </div>
                            </td>
                            <td
                              className="p-4"
                              data-testid={buildTestId(productTestId, 'product')}
                              onClick={() => router.push(`/products/${product.id}`)}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-white"
                                  data-testid={buildTestId(productTestId, 'image')}
                                >
                                  {productImageUrl ? (
                                    <div className="relative h-full w-full p-1">
                                      <Image
                                        src={productImageUrl}
                                        alt={product.name}
                                        width={40}
                                        height={40}
                                        className="h-full w-full rounded object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p
                                    className="font-medium"
                                    data-testid={buildTestId(productTestId, 'name')}
                                  >
                                    {product.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td
                              className="p-4 font-mono text-sm text-muted-foreground"
                              data-testid={buildTestId(productTestId, 'sku')}
                              onClick={() => router.push(`/products/${product.id}`)}
                            >
                              {product.sku}
                            </td>
                            <td
                              className="p-4"
                              data-testid={buildTestId(productTestId, 'category')}
                              onClick={() => router.push(`/products/${product.id}`)}
                            >
                              <Badge variant="secondary" testId={buildTestId(productTestId, 'category-badge')}>
                                {product.category}
                              </Badge>
                            </td>
                            <td className="p-4" data-testid={buildTestId(productTestId, 'scene-types')}>
                              <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                                {availableSceneTypes.length > 0 ? (
                                  <SceneTypeDropdown
                                    product={product}
                                    availableSceneTypes={availableSceneTypes}
                                    onSceneTypeChange={handleSceneTypeChange}
                                    productTestId={productTestId}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">No scene types</span>
                                )}
                              </div>
                            </td>
                            <td
                              className="p-4"
                              data-testid={buildTestId(productTestId, 'source')}
                              onClick={() => router.push(`/products/${product.id}`)}
                            >
                              <Badge
                                variant={product.source === 'imported' ? 'default' : 'outline'}
                                testId={buildTestId(productTestId, 'source-badge')}
                              >
                                {product.source === 'imported' ? (
                                  <>
                                    <Store className="mr-1 h-3 w-3" />
                                    Imported
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mr-1 h-3 w-3" />
                                    Uploaded
                                  </>
                                )}
                              </Badge>
                            </td>
                            <td className="p-4" data-testid={buildTestId(productTestId, 'actions')}>
                              <div
                                className="flex items-center justify-end gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  testId={buildTestId(productTestId, 'favorite')}
                                >
                                  {product.isFavorite ? (
                                    <Star className="h-4 w-4 fill-primary text-primary" />
                                  ) : (
                                    <StarOff className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      testId={buildTestId(productTestId, 'more')}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    testId={buildTestId(productTestId, 'menu')}
                                  >
                                    {product.source === 'imported' && product.storeUrl && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => window.open(product.storeUrl!, '_blank')}
                                          testId={buildTestId(productTestId, 'menu', 'view-product-page')}
                                        >
                                          <ExternalLink className="mr-2 h-4 w-4" />
                                          Go to Product Page
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator
                                          testId={buildTestId(productTestId, 'menu', 'separator-1')}
                                        />
                                      </>
                                    )}
                                    {product.source === 'imported' && (
                                      <>
                                        <DropdownMenuItem testId={buildTestId(productTestId, 'menu', 'view-store')}>
                                          <Store className="mr-2 h-4 w-4" />
                                          View in Store
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator
                                          testId={buildTestId(productTestId, 'menu', 'separator-2')}
                                        />
                                      </>
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteClick(product.id)}
                                      testId={buildTestId(productTestId, 'menu', 'delete')}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="products-grid">
                  {filteredProducts.map((product, index) => {
                    const productImageUrl = product.images?.[0]?.baseUrl || product.imageUrl;
                    const productTestId = buildTestId('product-card', product.id);
                    const isSelected = selectedProductIds.includes(product.id);
                    const availableSceneTypes = Array.from(
                      new Set([...(product.sceneTypes || []), ...sceneTypes])
                    ).sort();

                    return (
                      <ProductGridCard
                        key={product.id}
                        product={product}
                        isSelected={isSelected}
                        onSelect={() => toggleProduct(product.id)}
                        onProductClick={() => router.push(`/products/${product.id}`)}
                        onSceneTypeChange={handleSceneTypeChange}
                        onDeleteClick={handleDeleteClick}
                        availableSceneTypes={availableSceneTypes}
                        index={index}
                        productTestId={productTestId}
                      />
                    );
                  })}
                </div>
              )}

              {filteredProducts.length === 0 && (
                <div className="py-12 text-center" data-testid="products-empty">
                  <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 text-muted-foreground" data-testid={buildTestId('products-empty', 'message')}>
                    No products found
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setAddDialogOpen(true)}
                    testId={buildTestId('products-empty', 'add')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Products
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Selection Action Island */}
      {selectedProductIds.length > 0 && (
        <SelectionActionIsland
          selectedCount={selectedProductIds.length}
          showSelectedOnly={showSelectedOnly}
          onShowSelectedToggle={() => setShowSelectedOnly(!showSelectedOnly)}
          onDownload={handleDownloadSelected}
          onPin={handlePinSelected}
          onApprove={handleApproveSelected}
          onDelete={handleDeleteSelected}
          onClear={handleClearSelection}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setProductToDelete(null);
            setProductsToDelete([]);
          }
        }}
      >
        <AlertDialogContent data-testid="products-delete-dialog">
          <AlertDialogHeader data-testid={buildTestId('products-delete-dialog', 'header')}>
            <AlertDialogTitle data-testid={buildTestId('products-delete-dialog', 'title')}>
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid={buildTestId('products-delete-dialog', 'description')}>
              This action cannot be undone. This will permanently delete{' '}
              {productsToDelete.length > 0
                ? `${productsToDelete.length} products`
                : 'the product'}{' '}
              from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter data-testid={buildTestId('products-delete-dialog', 'footer')}>
            <AlertDialogCancel data-testid={buildTestId('products-delete-dialog', 'cancel')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid={buildTestId('products-delete-dialog', 'confirm')}
            >
              {deleteMutation.isPending || bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Products Modal */}
      <ImportProductsModal
        open={isOpen('import-products')}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          toast.success('Products imported successfully');
        }}
      />
    </>
  );
}

// Selection Action Island Component
function SelectionActionIsland({
  selectedCount,
  showSelectedOnly,
  onShowSelectedToggle,
  onDownload,
  onPin,
  onApprove,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  showSelectedOnly: boolean;
  onShowSelectedToggle: () => void;
  onDownload: () => void;
  onPin: () => void;
  onApprove: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2" data-testid="selection-island">
      <div
        className={cn(
          'flex items-center gap-4 rounded-full border border-border',
          'bg-card/95 px-6 py-3 shadow-xl backdrop-blur',
          'animate-in fade-in slide-in-from-bottom-4 duration-300'
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onClear}
          testId="selection-island-clear"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Selection count */}
        <div className="flex items-center gap-2 border-r border-border pr-4">
          <span className="text-sm font-medium" data-testid="selection-island-count">
            {selectedCount} selected
          </span>
        </div>

        {/* Show selected toggle */}
        <Button
          variant={showSelectedOnly ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onShowSelectedToggle}
          testId="selection-island-show-toggle"
        >
          {showSelectedOnly ? (
            <Filter className="mr-2 h-4 w-4" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          {showSelectedOnly ? 'Show All' : 'Show Selected'}
        </Button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 border-l border-border pl-4">
          <Button variant="ghost" size="sm" onClick={onDownload} testId="selection-island-download">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onPin} testId="selection-island-pin">
            <Heart className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onApprove} testId="selection-island-approve">
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            testId="selection-island-delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Scene Type Dropdown Component
function SceneTypeDropdown({
  product,
  availableSceneTypes,
  onSceneTypeChange,
  productTestId,
}: {
  product: Product;
  availableSceneTypes: string[];
  onSceneTypeChange: (productId: string, sceneType: string) => void;
  productTestId?: string;
}) {
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customSceneType, setCustomSceneType] = React.useState('');

  const handleCustomSceneTypeSubmit = () => {
    if (customSceneType.trim()) {
      onSceneTypeChange(product.id, customSceneType.trim());
      setShowCustomInput(false);
      setCustomSceneType('');
    }
  };

  return (
    <DropdownMenu open={showCustomInput ? true : undefined}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          data-testid={buildTestId(productTestId, 'scene-type-dropdown')}
        >
          {(product as any).selectedSceneType || product.sceneTypes?.[0] || 'Select scene type'} ▾
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
        {showCustomInput ? (
          <div className="p-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Enter scene type..."
              value={customSceneType}
              onChange={(e) => setCustomSceneType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomSceneTypeSubmit();
                } else if (e.key === 'Escape') {
                  setShowCustomInput(false);
                  setCustomSceneType('');
                }
              }}
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
              autoFocus
            />
            <div className="mt-2 flex gap-1">
              <button
                onClick={handleCustomSceneTypeSubmit}
                className="flex-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomSceneType('');
                }}
                className="flex-1 rounded border border-border px-2 py-1 text-xs hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {availableSceneTypes.map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={(e) => {
                  e.stopPropagation();
                  onSceneTypeChange(product.id, type);
                }}
                className={cn(
                  (product as any).selectedSceneType === type ||
                    (!((product as any).selectedSceneType) && type === product.sceneTypes?.[0])
                    ? 'bg-primary/10 font-medium text-primary'
                    : ''
                )}
                data-testid={buildTestId(productTestId, 'scene-type', type)}
              >
                {type}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomInput(true);
              }}
              className="border-t border-border font-medium text-primary"
              data-testid={buildTestId(productTestId, 'scene-type', 'custom')}
            >
              + Custom...
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Product Grid Card Component
function ProductGridCard({
  product,
  isSelected,
  onSelect,
  onProductClick,
  onSceneTypeChange,
  onDeleteClick,
  availableSceneTypes,
  index,
  productTestId,
}: {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  onProductClick: () => void;
  onSceneTypeChange: (productId: string, sceneType: string) => void;
  onDeleteClick: (productId: string) => void;
  availableSceneTypes: string[];
  index: number;
  productTestId?: string;
}) {
  const productImageUrl = product.images?.[0]?.baseUrl || product.imageUrl;

  return (
    <Card
      hover
      className={cn(
        'animate-fade-in cursor-pointer overflow-hidden opacity-0 transition-all duration-300',
        isSelected && 'glow-primary-sm border-primary bg-primary/5',
        `stagger-${Math.min(index + 1, 8)}`
      )}
      onClick={onProductClick}
      testId={productTestId}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-white" data-testid={buildTestId(productTestId, 'image')}>
        {productImageUrl ? (
          <div className="relative h-full w-full p-4">
            <Image src={productImageUrl} alt={product.name} fill className="object-contain p-2" sizes="300px" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Checkbox Overlay */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            'absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded border-2 transition-all',
            isSelected
              ? 'scale-110 border-primary bg-primary text-primary-foreground'
              : 'border-white/80 bg-black/30 hover:border-primary hover:bg-primary/20'
          )}
          data-testid={buildTestId(productTestId, 'select')}
        >
          {isSelected && <Check className="h-4 w-4" />}
        </div>

        {/* Source badge */}
        <Badge
          className="absolute bottom-3 right-3"
          variant={product.source === 'imported' ? 'default' : 'outline'}
          testId={buildTestId(productTestId, 'source-badge')}
        >
          {product.source === 'imported' ? (
            <>
              <Store className="mr-1 h-3 w-3" />
              Imported
            </>
          ) : (
            <>
              <Upload className="mr-1 h-3 w-3" />
              Uploaded
            </>
          )}
        </Badge>
      </div>

      {/* Info Section */}
      <div className="p-3" data-testid={buildTestId(productTestId, 'content')}>
        <h3 className="truncate text-sm font-medium" data-testid={buildTestId(productTestId, 'name')}>
          {product.name}
        </h3>
        <p
          className="truncate font-mono text-xs text-muted-foreground"
          data-testid={buildTestId(productTestId, 'sku')}
        >
          {product.sku}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs" testId={buildTestId(productTestId, 'category')}>
            {product.category}
          </Badge>
          {availableSceneTypes.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <SceneTypeDropdown
                product={product}
                availableSceneTypes={availableSceneTypes}
                onSceneTypeChange={onSceneTypeChange}
                productTestId={productTestId}
              />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
            }}
            testId={buildTestId(productTestId, 'favorite')}
          >
            {product.isFavorite ? (
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            ) : (
              <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
                testId={buildTestId(productTestId, 'more')}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid={buildTestId(productTestId, 'menu')}>
              {product.source === 'imported' && product.storeUrl && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(product.storeUrl!, '_blank');
                    }}
                    data-testid={buildTestId(productTestId, 'menu', 'view-product-page')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Go to Product Page
                  </DropdownMenuItem>
                  <DropdownMenuSeparator data-testid={buildTestId(productTestId, 'menu', 'separator-1')} />
                </>
              )}
              {product.source === 'imported' && (
                <>
                  <DropdownMenuItem testId={buildTestId(productTestId, 'menu', 'view-store')}>
                    <Store className="mr-2 h-4 w-4" />
                    View in Store
                  </DropdownMenuItem>
                  <DropdownMenuSeparator testId={buildTestId(productTestId, 'menu', 'separator-2')} />
                </>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(product.id);
                }}
                testId={buildTestId(productTestId, 'menu', 'delete')}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

export function ProductsClient() {
  return (
    <Suspense fallback={null}>
      <ProductsPageContent />
    </Suspense>
  );
}
