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
        actions={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glow">
                <Plus className="mr-2 h-4 w-4" />
                Add Products
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Products</DialogTitle>
                <DialogDescription>
                  Choose how you want to add products to your catalog.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Button
                  variant="outline"
                  className="h-auto justify-start p-4"
                  onClick={() => {
                    setAddDialogOpen(false);
                    openModal('connect-store');
                  }}
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

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <SearchInput
            placeholder="Search products..."
            className="sm:w-80"
            value={searchQuery}
            onSearch={setSearchQuery}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="imported">Imported</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Table */}
        <Card>
          {isLoading ? (
            <div className="p-8">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-destructive">
                {error instanceof Error ? error.message : 'Failed to load products'}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-4 text-left font-medium text-muted-foreground">Product</th>
                      <th className="p-4 text-left font-medium text-muted-foreground">SKU</th>
                      <th className="p-4 text-left font-medium text-muted-foreground">Category</th>
                      <th className="p-4 text-left font-medium text-muted-foreground">
                        Room Types
                      </th>
                      <th className="p-4 text-left font-medium text-muted-foreground">Source</th>
                      <th className="p-4 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product, index) => {
                      const productImageUrl = product.images?.[0]?.baseUrl || product.imageUrl;
                      return (
                        <tr
                          key={product.id}
                          onClick={() => router.push(`/products/${product.id}`)}
                          className={cn(
                            'cursor-pointer border-b border-border transition-colors hover:bg-secondary/30',
                            'animate-fade-in opacity-0',
                            `stagger-${Math.min(index + 1, 6)}`
                          )}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
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
                                <p className="font-medium">{product.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-sm text-muted-foreground">
                            {product.sku}
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">{product.category}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {(product.sceneTypes ?? []).map((room) => (
                                <Badge key={room} variant="muted" className="text-xs">
                                  {room}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant={product.source === 'imported' ? 'default' : 'outline'}>
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
                          <td className="p-4">
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
                              >
                                {product.isFavorite ? (
                                  <Star className="h-4 w-4 fill-primary text-primary" />
                                ) : (
                                  <StarOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {product.source === 'imported' && (
                                    <DropdownMenuItem>
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View in Store
                                    </DropdownMenuItem>
                                  )}
                                  {product.source === 'imported' && <DropdownMenuSeparator />}
                                  <DropdownMenuItem className="text-destructive focus:text-destructive">
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
                <div className="py-12 text-center">
                  <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 text-muted-foreground">No products found</p>
                  <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
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
