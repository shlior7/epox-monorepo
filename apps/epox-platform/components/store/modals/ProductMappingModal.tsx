'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Link2, ExternalLink, Loader2, Check, Package } from 'lucide-react';
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

interface ProductMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  currentStoreId?: string | null;
  currentStoreName?: string | null;
  testId?: string;
}

export function ProductMappingModal({
  open,
  onOpenChange,
  productId,
  productName,
  currentStoreId,
  currentStoreName,
  testId = 'product-mapping-modal',
}: ProductMappingModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  // Fetch store products
  const {
    data: storeProducts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['store-products', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '20');

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

  // Map product mutation
  const mapProductMutation = useMutation({
    mutationFn: async (storeProduct: StoreProduct) => {
      const response = await fetch('/api/product/store-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          storeId: String(storeProduct.id),
          storeUrl: storeProduct.images?.[0]?.src?.split('/').slice(0, 3).join('/') || null,
          storeName: storeProduct.name,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to map product');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-assets'] });
      onOpenChange(false);
    },
  });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setSelectedProduct(null);
  }, []);

  const handleSelect = useCallback((product: StoreProduct) => {
    setSelectedProduct(product);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedProduct) {
      mapProductMutation.mutate(selectedProduct);
    }
  }, [selectedProduct, mapProductMutation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid={`${testId}-title`}>
            <Link2 className="h-5 w-5" />
            Map Product to Store
          </DialogTitle>
          <DialogDescription data-testid={`${testId}-description`}>
            Select a product from your store to link with <strong>{productName}</strong>.
            {currentStoreName && (
              <span className="block mt-1 text-muted-foreground">
                Currently mapped to: <strong>{currentStoreName}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative" data-testid={`${testId}-search-wrapper`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search store products..."
            value={search}
            onChange={handleSearch}
            className="pl-9"
            data-testid={`${testId}-search`}
          />
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto min-h-[300px]" data-testid={`${testId}-products-list`}>
          {isLoading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
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
            <div className="space-y-2 p-1">
              {storeProducts.items.map((product) => {
                const isSelected = selectedProduct?.id === product.id;
                const isCurrentMapping = String(product.id) === currentStoreId;
                const imageUrl = product.images?.[0]?.src;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/50',
                      isCurrentMapping && !isSelected && 'border-green-500 bg-green-50'
                    )}
                    data-testid={`${testId}-product-${product.id}`}
                  >
                    {/* Product Image */}
                    <div className="relative h-14 w-14 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{product.name}</span>
                        {isCurrentMapping && (
                          <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground truncate">
                          SKU: {product.sku}
                        </p>
                      )}
                      {product.categories?.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {product.categories.map((c) => c.name).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid={`${testId}-cancel-btn`}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProduct || mapProductMutation.isPending}
            data-testid={`${testId}-confirm-btn`}
          >
            {mapProductMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mapping...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Map Product
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
