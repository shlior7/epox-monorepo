'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package, Check, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { SearchInput, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface ProductSelectionStepProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  collectionName: string;
  onNameChange: (name: string) => void;
}

export function ProductSelectionStep({
  selectedIds,
  onSelectionChange,
  collectionName,
  onNameChange,
}: ProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch products with useQuery
  const {
    data: productsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products', { search: searchQuery, category: categoryFilter }],
    queryFn: () =>
      apiClient.listProducts({
        search: searchQuery || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        limit: 100,
      }),
    staleTime: 30 * 1000, // Data fresh for 30s
  });

  const products = productsData?.products ?? [];
  const categories = productsData?.filters?.categories ?? [];
  const filteredProducts = products;

  const toggleProduct = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    const filteredIds = filteredProducts.map((p) => p.id);
    const newSelection = Array.from(new Set([...selectedIds, ...filteredIds]));
    onSelectionChange(newSelection);
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl py-16 text-center">
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-6xl py-16 text-center">
        <p className="text-red-500">Failed to load products. Please try again.</p>
      </div>
    );
  }

  // Empty state
  if (products.length === 0 && !searchQuery && categoryFilter === 'all') {
    return (
      <div className="mx-auto max-w-6xl py-16 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          No products available. Please add products to your catalog first.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 text-center">
        <h2 className="text-gradient-gold mb-2 text-2xl font-bold">Create Collection</h2>
        <p className="text-muted-foreground">
          Name your collection and choose the products you want to include.
        </p>
      </div>

      {/* Collection Name Input */}
      <Card className="mb-8 p-6">
        <div className="space-y-2">
          <label htmlFor="collection-name" className="text-base font-medium">
            Collection Name
          </label>
          <Input
            id="collection-name"
            placeholder="e.g., Summer 2026 Living Room"
            value={collectionName}
            onChange={(e) => onNameChange(e.target.value)}
            className="text-lg"
          />
          <p className="text-sm text-muted-foreground">
            Give your collection a descriptive name to help you find it later.
          </p>
        </div>
      </Card>

      {/* Filters & Actions Bar */}
      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-border/50 bg-card/50 p-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Filter Tools */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Search products..."
            className="sm:max-w-xs"
            value={searchQuery}
            onSearch={setSearchQuery}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
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
        </div>

        {/* Right: Selection Actions */}
        <div className="flex items-center gap-3 border-t border-border/30 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-semibold">{selectedIds.length}</span>
              <span className="text-muted-foreground">selected</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="font-medium">
              Select All
            </Button>
            {selectedIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product, index) => {
          const isSelected = selectedIds.includes(product.id);
          return (
            <Card
              key={product.id}
              hover
              className={cn(
                'animate-fade-in cursor-pointer p-4 opacity-0 transition-all duration-300',
                isSelected && 'glow-primary-sm border-primary bg-primary/5',
                `stagger-${Math.min(index + 1, 8)}`
              )}
              onClick={() => toggleProduct(product.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200',
                    isSelected
                      ? 'scale-110 border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/40'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
                      {product.images?.[0]?.baseUrl || product.imageUrl ? (
                        <Image
                          src={product.images?.[0]?.baseUrl || product.imageUrl}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="h-full w-full rounded object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium">{product.name}</h3>
                      <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {product.category}
                    </Badge>
                    {(product.sceneTypes ?? product.sceneTypes ?? []).map((room) => (
                      <Badge key={room} variant="muted" className="text-xs">
                        {room}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="animate-fade-in py-16 text-center opacity-0">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No products found matching your search</p>
        </div>
      )}
    </div>
  );
}
