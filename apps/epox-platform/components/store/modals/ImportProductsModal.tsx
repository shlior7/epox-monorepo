'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Package, Import, Loader2, Check, X } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface StoreProduct {
  id: string | number;
  name: string;
  description: string;
  sku?: string;
  status: string;
  images: Array<{ id: string | number; src: string; alt?: string }>;
  categories: Array<{ id: string | number; name: string; slug: string }>;
}

export interface ImportResult {
  imported: number;
  products: Array<{ id: string; name: string; storeId: string }>;
  unconfiguredCategories: Array<{ id: string; name: string; productCount: number }>;
}

interface ImportProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: ImportResult) => void;
  testId?: string;
}

export function ImportProductsModal({
  open,
  onOpenChange,
  onImportComplete,
  testId = 'import-products-modal',
}: ImportProductsModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Fetch store products
  const {
    data: storeProducts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['store-products-import', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '50');

      const response = await fetch(`/api/store/products?${params}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch store products');
      }
      return response.json() as Promise<{
        items: StoreProduct[];
        total: number;
        hasMore: boolean;
      }>;
    },
    enabled: open,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Import products mutation
  const importMutation = useMutation({
    mutationFn: async (productIds: Array<string | number>) => {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import products');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['store-assets'] });
      setSelectedIds(new Set());
      onImportComplete?.({
        imported: data.imported,
        products: data.products,
        unconfiguredCategories: data.unconfiguredCategories ?? [],
      });
      onOpenChange(false);
    },
  });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleToggleSelect = useCallback((productId: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!storeProducts?.items) return;

    const allIds = storeProducts.items.map((p) => p.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [storeProducts?.items, selectedIds]);

  const handleImport = useCallback(() => {
    if (selectedIds.size > 0) {
      importMutation.mutate(Array.from(selectedIds));
    }
  }, [selectedIds, importMutation]);

  const allSelected = storeProducts?.items
    ? storeProducts.items.length > 0 && storeProducts.items.every((p) => selectedIds.has(p.id))
    : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid={`${testId}-title`}>
            <Import className="h-5 w-5" />
            Import Products from Store
          </DialogTitle>
          <DialogDescription data-testid={`${testId}-description`}>
            Select products from your store to import into the platform. Imported products can be used
            to generate images.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Select All */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1" data-testid={`${testId}-search-wrapper`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={handleSearch}
              className="pl-9"
              data-testid={`${testId}-search`}
            />
          </div>
          {storeProducts?.items && storeProducts.items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              data-testid={`${testId}-select-all-btn`}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px]" data-testid={`${testId}-products-grid`}>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <X className="h-12 w-12 text-destructive mb-3" />
              <p className="text-sm text-destructive" data-testid={`${testId}-error`}>
                {error instanceof Error ? error.message : 'Failed to load products'}
              </p>
            </div>
          ) : !storeProducts?.items?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground" data-testid={`${testId}-empty`}>
                {search ? 'No products found matching your search' : 'No products found in your store'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
              {storeProducts.items.map((product) => {
                const isSelected = selectedIds.has(product.id);
                const imageUrl = product.images?.[0]?.src;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleToggleSelect(product.id)}
                    className={cn(
                      'relative group rounded-lg border overflow-hidden text-left transition-all',
                      isSelected
                        ? 'border-primary ring-2 ring-primary'
                        : 'border-border hover:border-muted-foreground'
                    )}
                    data-testid={`${testId}-product-${product.id}`}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={isSelected}
                        className="bg-background/80 backdrop-blur"
                        data-testid={`${testId}-product-${product.id}-checkbox`}
                      />
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}

                    {/* Product Image */}
                    <div className="aspect-square bg-muted">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-2">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground truncate">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-sm text-muted-foreground" data-testid={`${testId}-selected-count`}>
            {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid={`${testId}-cancel-btn`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedIds.size === 0 || importMutation.isPending}
              data-testid={`${testId}-import-btn`}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Import className="h-4 w-4 mr-2" />
                  Import Selected
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
