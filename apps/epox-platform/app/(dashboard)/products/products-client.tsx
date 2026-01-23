'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
import { PageHeader } from '@/components/layout';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useModal } from '@/lib/hooks/use-modal';
import { buildTestId } from '@/lib/testing/testid';

function ProductsPageContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { openModal } = useModal();

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
  const filteredProducts = products;

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
                    openModal('connect-store');
                  }}
                  testId={buildTestId('products-add-dialog', 'import-store')}
                >
                  <Store className="mr-4 h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Import from Store</p>
                    <p className="text-sm text-muted-foreground">
                      Connect Shopify, WooCommerce, or other platforms
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row" data-testid="products-filters">
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
              <div className="overflow-x-auto" data-testid="products-table">
                <table className="w-full" data-testid={buildTestId('products-table', 'table')}>
                  <thead>
                    <tr className="border-b border-border">
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
                        data-testid={buildTestId('products-table', 'header', 'room-types')}
                      >
                        Room Types
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
                      return (
                        <tr
                          key={product.id}
                          onClick={() => router.push(`/products/${product.id}`)}
                          className={cn(
                            'cursor-pointer border-b border-border transition-colors hover:bg-secondary/30',
                            'animate-fade-in opacity-0',
                            `stagger-${Math.min(index + 1, 6)}`
                          )}
                          data-testid={productTestId}
                        >
                          <td className="p-4" data-testid={buildTestId(productTestId, 'product')}>
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary"
                                data-testid={buildTestId(productTestId, 'image')}
                              >
                                {productImageUrl ? (
                                  <Image
                                    src={productImageUrl}
                                    alt={product.name}
                                    width={40}
                                    height={40}
                                    className="h-full w-full rounded object-cover"
                                  />
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
                          >
                            {product.sku}
                          </td>
                          <td className="p-4" data-testid={buildTestId(productTestId, 'category')}>
                            <Badge variant="secondary" testId={buildTestId(productTestId, 'category-badge')}>
                              {product.category}
                            </Badge>
                          </td>
                          <td className="p-4" data-testid={buildTestId(productTestId, 'room-types')}>
                            <div className="flex flex-wrap gap-1">
                              {(product.sceneTypes ?? []).map((room) => (
                                <Badge
                                  key={room}
                                  variant="muted"
                                  className="text-xs"
                                  testId={buildTestId(productTestId, 'room-type', room)}
                                >
                                  {room}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-4" data-testid={buildTestId(productTestId, 'source')}>
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
                                  {product.source === 'imported' && (
                                    <DropdownMenuItem testId={buildTestId(productTestId, 'menu', 'view-store')}>
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View in Store
                                    </DropdownMenuItem>
                                  )}
                                  {product.source === 'imported' && (
                                    <DropdownMenuSeparator
                                      testId={buildTestId(productTestId, 'menu', 'separator')}
                                    />
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
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
    </>
  );
}

export function ProductsClient() {
  return (
    <Suspense fallback={null}>
      <ProductsPageContent />
    </Suspense>
  );
}
