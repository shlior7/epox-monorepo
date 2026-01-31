'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Package,
  Check,
  Search,
  Loader2,
  LayoutGrid,
  Rows3,
  Calendar,
  ImageIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatRelativeTime } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { apiClient, type Product } from '@/lib/api-client';

export type ViewMode = 'grid' | 'list';

// Extended product type with optional fields for display
export interface ProductWithStats extends Product {
  generatedCount?: number;
  pendingCount?: number;
}

export interface ProductGridFilters {
  search?: string;
  category?: string;
  sceneType?: string;
  sortBy?: 'name' | 'date' | 'category';
}

export interface ProductGridProps {
  // Selection
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;

  // View mode
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewToggle?: boolean;

  // Filters (controlled externally or internally)
  filters?: ProductGridFilters;
  onFiltersChange?: (filters: ProductGridFilters) => void;
  showFilters?: boolean;

  // Data options
  products?: ProductWithStats[]; // Pass products directly, or let component fetch
  isLoading?: boolean;
  collectionId?: string; // Filter by collection
  filterToIds?: string[]; // Only show products with these IDs (for "show selected" feature)

  // Behavior
  onProductClick?: (product: ProductWithStats) => void;
  onSceneTypeChange?: (productId: string, sceneType: string) => void;
  selectionMode?: 'checkbox' | 'card'; // checkbox = only checkbox selects, card = entire card selects

  // Display options
  showGeneratedAssets?: boolean;
  showSelectionCount?: boolean;
  showSelectAll?: boolean;
  emptyStateMessage?: string;
  className?: string;
  collectionFilterHeader?: React.ReactNode; // Optional header to show after filters

  // List view specific
  listRowHeight?: number; // Default 260px
  testId?: string;
}

// Product card for grid view
function ProductGridCard({
  product,
  isSelected,
  onSelect,
  onProductClick,
  onSceneTypeChange,
  selectionMode,
  showGeneratedAssets,
  index,
  allSceneTypes = [],
}: {
  product: ProductWithStats;
  isSelected: boolean;
  onSelect: () => void;
  onProductClick?: () => void;
  onSceneTypeChange?: (sceneType: string) => void;
  selectionMode: 'checkbox' | 'card';
  showGeneratedAssets?: boolean;
  index: number;
  allSceneTypes?: string[];
}) {
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customSceneType, setCustomSceneType] = React.useState('');

  const productTestId = buildTestId('product-card', product.id);
  const imageUrl = product.images?.[0]?.previewUrl || product.images?.[0]?.baseUrl || product.imageUrl;

  // Merge all scene types (product's scene types + all available scene types)
  const availableSceneTypes = React.useMemo(() => {
    const combined = new Set([...(product.sceneTypes || []), ...allSceneTypes]);
    return Array.from(combined).sort();
  }, [product.sceneTypes, allSceneTypes]);

  const handleClick = () => {
    if (selectionMode === 'card') {
      onSelect();
    } else if (onProductClick) {
      onProductClick();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleCustomSceneTypeSubmit = () => {
    if (customSceneType.trim()) {
      onSceneTypeChange?.(customSceneType.trim());
      setShowCustomInput(false);
      setCustomSceneType('');
    }
  };

  return (
    <Card
      hover
      className={cn(
        'animate-fade-in cursor-pointer overflow-hidden opacity-0 transition-all duration-300',
        isSelected && 'glow-primary-sm border-primary bg-primary/5',
        `stagger-${Math.min(index + 1, 8)}`
      )}
      onClick={handleClick}
      testId={productTestId}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-white" data-testid={buildTestId(productTestId, 'image')}>
        {imageUrl ? (
          <div className="relative h-full w-full p-4">
            <Image src={imageUrl} alt={product.name} fill className="object-contain p-2" sizes="300px" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Checkbox Overlay */}
        <div
          onClick={handleCheckboxClick}
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

        {/* Generated count badge */}
        {showGeneratedAssets && product.generatedCount !== undefined && product.generatedCount > 0 && (
          <Badge
            className="absolute bottom-3 right-3"
            variant="secondary"
            testId={buildTestId(productTestId, 'generated')}
          >
            <ImageIcon className="mr-1 h-3 w-3" />
            {product.generatedCount}
          </Badge>
        )}
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
          {product.linkedCategories?.map((lc) => (
            <Badge
              key={lc.categoryId}
              variant={lc.isPrimary ? 'default' : 'outline'}
              className="text-xs"
              testId={buildTestId(productTestId, 'linked-category', lc.categoryId)}
            >
              {lc.categoryName}
            </Badge>
          ))}
          {(product.sceneTypes && product.sceneTypes.length > 0) || availableSceneTypes.length > 0 ? (
            <DropdownMenu open={showCustomInput ? true : undefined}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
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
                          onSceneTypeChange?.(type);
                        }}
                        className={cn(
                          (product as any).selectedSceneType === type || (!((product as any).selectedSceneType) && type === product.sceneTypes?.[0])
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
          ) : null}
        </div>
      </div>
    </Card>
  );
}

// Product row for list view
function ProductListRow({
  product,
  isSelected,
  onSelect,
  onProductClick,
  onSceneTypeChange,
  selectionMode,
  showGeneratedAssets,
  height,
  allSceneTypes = [],
}: {
  product: ProductWithStats;
  isSelected: boolean;
  onSelect: () => void;
  onProductClick?: () => void;
  onSceneTypeChange?: (sceneType: string) => void;
  selectionMode: 'checkbox' | 'card';
  showGeneratedAssets?: boolean;
  height: number;
  allSceneTypes?: string[];
}) {
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customSceneType, setCustomSceneType] = React.useState('');

  const productTestId = buildTestId('product-card', product.id);
  const imageUrl = product.images?.[0]?.previewUrl || product.images?.[0]?.baseUrl || product.imageUrl;
  const baseImages = product.images || [];

  // Merge all scene types (product's scene types + all available scene types)
  const availableSceneTypes = React.useMemo(() => {
    const combined = new Set([...(product.sceneTypes || []), ...allSceneTypes]);
    return Array.from(combined).sort();
  }, [product.sceneTypes, allSceneTypes]);

  const handleRowClick = () => {
    if (selectionMode === 'card') {
      onSelect();
    } else if (onProductClick) {
      onProductClick();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleCustomSceneTypeSubmit = () => {
    if (customSceneType.trim()) {
      onSceneTypeChange?.(customSceneType.trim());
      setShowCustomInput(false);
      setCustomSceneType('');
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'group flex cursor-pointer gap-4 rounded-lg border bg-card p-4 transition-all hover:border-primary/50',
        isSelected && 'border-primary bg-primary/5'
      )}
      style={{ height }}
      data-testid={productTestId}
    >
      {/* Checkbox */}
      <div
        onClick={handleCheckboxClick}
        className={cn(
          'mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-all',
          isSelected
            ? 'scale-110 border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-primary'
        )}
        data-testid={buildTestId(productTestId, 'select')}
      >
        {isSelected && <Check className="h-4 w-4" />}
      </div>

      {/* Main Image */}
      <div
        className="relative aspect-square h-full shrink-0 overflow-hidden rounded-lg bg-white"
        data-testid={buildTestId(productTestId, 'image')}
      >
        {imageUrl ? (
          <div className="relative h-full w-full p-3">
            <Image src={imageUrl} alt={product.name} fill className="object-contain p-1" sizes="260px" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {/* Selected base image indicator */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/30" />
      </div>

      {/* Base Images Gallery */}
      {baseImages.length > 1 && (
        <div className="flex h-full flex-col gap-2" data-testid={buildTestId(productTestId, 'gallery')}>
          {baseImages.slice(1, 4).map((img, idx) => (
            <div
              key={img.id || idx}
              className="relative aspect-square h-[calc(33%-4px)] shrink-0 overflow-hidden rounded bg-white"
              data-testid={buildTestId(productTestId, 'gallery', img.id || idx)}
            >
              <div className="relative h-full w-full p-1">
                <Image
                  src={img.previewUrl || img.baseUrl || ''}
                  alt={`${product.name} - ${idx + 2}`}
                  fill
                  className="object-contain"
                  sizes="80px"
                />
              </div>
            </div>
          ))}
          {baseImages.length > 4 && (
            <div
              className="flex h-[calc(33%-4px)] items-center justify-center rounded bg-secondary text-xs text-muted-foreground"
              data-testid={buildTestId(productTestId, 'gallery', 'more')}
            >
              +{baseImages.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Product Info */}
      <div
        className="flex min-w-0 flex-1 flex-col justify-between py-1"
        data-testid={buildTestId(productTestId, 'content')}
      >
        <div>
          <h3 className="truncate text-base font-medium" data-testid={buildTestId(productTestId, 'name')}>
            {product.name}
          </h3>
          <p
            className="font-mono text-sm text-muted-foreground"
            data-testid={buildTestId(productTestId, 'sku')}
          >
            {product.sku}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" testId={buildTestId(productTestId, 'category')}>
              {product.category}
            </Badge>
            {product.linkedCategories?.map((lc) => (
              <Badge
                key={lc.categoryId}
                variant={lc.isPrimary ? 'default' : 'outline'}
                testId={buildTestId(productTestId, 'linked-category', lc.categoryId)}
              >
                {lc.categoryName}
              </Badge>
            ))}
            {(product.sceneTypes && product.sceneTypes.length > 0) || availableSceneTypes.length > 0 ? (
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
                            onSceneTypeChange?.(type);
                          }}
                          className={cn(
                            (product as any).selectedSceneType === type || (!((product as any).selectedSceneType) && type === product.sceneTypes?.[0])
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
            ) : null}
          </div>
        </div>

        {/* Bottom info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground" data-testid={buildTestId(productTestId, 'meta')}>
          {showGeneratedAssets && product.generatedCount !== undefined && (
            <span className="flex items-center gap-1" data-testid={buildTestId(productTestId, 'generated')}>
              <ImageIcon className="h-3.5 w-3.5" />
              {product.generatedCount} generated
            </span>
          )}
          {product.createdAt && (
            <span className="flex items-center gap-1" data-testid={buildTestId(productTestId, 'created')}>
              <Calendar className="h-3.5 w-3.5" />
              {formatRelativeTime(new Date(product.createdAt))}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

export function ProductGrid({
  selectedIds,
  onSelectionChange,
  viewMode: controlledViewMode,
  onViewModeChange,
  showViewToggle = true,
  filters: controlledFilters,
  onFiltersChange,
  showFilters = true,
  products: externalProducts,
  isLoading: externalLoading,
  collectionId,
  filterToIds,
  onProductClick,
  onSceneTypeChange,
  selectionMode = 'card',
  showGeneratedAssets = false,
  showSelectionCount = true,
  showSelectAll = true,
  emptyStateMessage = 'No products available',
  className,
  collectionFilterHeader,
  listRowHeight = 220,
  testId,
}: ProductGridProps) {
  // Internal state for view mode and filters if not controlled
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('grid');
  const [internalFilters, setInternalFilters] = useState<ProductGridFilters>({});

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
  const filters = controlledFilters ?? internalFilters;
  const setFilters = onFiltersChange ?? setInternalFilters;

  // Fetch products if not provided externally
  // Note: Search is done client-side for instant results
  const {
    data: productsData,
    isLoading: queryLoading,
    error,
  } = useQuery({
    queryKey: ['products', { category: filters.category, collectionId }],
    queryFn: () =>
      apiClient.listProducts({
        category: filters.category !== 'all' ? filters.category : undefined,
        limit: 100,
      }),
    staleTime: 30 * 1000,
    enabled: !externalProducts,
  });

  const products = externalProducts ?? productsData?.products ?? [];
  const categories = productsData?.filters?.categories ?? [];
  const sceneTypes = productsData?.filters?.sceneTypes ?? [];
  const isLoading = externalLoading ?? queryLoading;

  // Filter products client-side for instant search, scene type, and filterToIds
  const filteredProducts = useMemo(() => {
    let result = products;

    // Filter by specific IDs if provided (for "show selected" feature)
    if (filterToIds && filterToIds.length > 0) {
      const idsSet = new Set(filterToIds);
      result = result.filter((p) => idsSet.has(p.id));
    }

    // Client-side search for instant results
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower) ||
          p.sceneTypes?.some((st) => st.toLowerCase().includes(searchLower))
      );
    }

    // Filter by scene type
    if (filters.sceneType && filters.sceneType !== 'all') {
      result = result.filter((p) => p.sceneTypes?.includes(filters.sceneType!));
    }

    return result;
  }, [products, filters.search, filters.sceneType, filterToIds]);

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

  const updateFilter = (key: keyof ProductGridFilters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn('flex items-center justify-center py-16', className)}
        data-testid={buildTestId(testId, 'loading')}
      >
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('py-16 text-center', className)} data-testid={buildTestId(testId, 'error')}>
        <p className="text-red-500">Failed to load products. Please try again.</p>
      </div>
    );
  }

  // Empty state
  if (products.length === 0 && !filters.search && filters.category === 'all') {
    return (
      <div className={cn('py-16 text-center', className)} data-testid={buildTestId(testId, 'empty')}>
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{emptyStateMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)} data-testid={testId}>
      {/* Filters & Actions Bar */}
      {showFilters && (
        <div
          className="flex-none flex flex-col gap-4 rounded-lg border border-border/50 bg-card/50 p-4 lg:flex-row lg:items-center lg:justify-between"
          data-testid={buildTestId(testId, 'filters')}
        >
          {/* Left: Filter Tools */}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Search products..."
              className="sm:max-w-xs"
              value={filters.search || ''}
              onSearch={(value) => updateFilter('search', value)}
              testId={buildTestId(testId, 'search')}
            />
            {categories.length > 0 && (
              <Select
                value={filters.category || 'all'}
                onValueChange={(v) => updateFilter('category', v)}
              >
                <SelectTrigger className="w-full sm:w-40" testId={buildTestId(testId, 'category-trigger')}>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent testId={buildTestId(testId, 'category-content')}>
                  <SelectItem value="all" testId={buildTestId(testId, 'category', 'all')}>
                    All Categories
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} testId={buildTestId(testId, 'category', cat)}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {sceneTypes.length > 0 && (
              <Select
                value={filters.sceneType || 'all'}
                onValueChange={(v) => updateFilter('sceneType', v)}
              >
                <SelectTrigger className="w-full sm:w-40" testId={buildTestId(testId, 'scene-trigger')}>
                  <SelectValue placeholder="Scene Type" />
                </SelectTrigger>
                <SelectContent testId={buildTestId(testId, 'scene-content')}>
                  <SelectItem value="all" testId={buildTestId(testId, 'scene', 'all')}>
                    All Scene Types
                  </SelectItem>
                  {sceneTypes.map((sceneType) => (
                    <SelectItem
                      key={sceneType}
                      value={sceneType}
                      testId={buildTestId(testId, 'scene', sceneType)}
                    >
                      {sceneType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Right: Selection Actions & View Toggle */}
          <div className="flex items-center gap-3 border-t border-border/30 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            {showSelectionCount && selectedIds.length > 0 && (
              <div
                className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                data-testid={buildTestId(testId, 'selection-count')}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="font-semibold">{selectedIds.length}</span>
                <span className="text-muted-foreground">selected</span>
              </div>
            )}
            {showSelectAll && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="font-medium"
                  testId={buildTestId(testId, 'select-all')}
                >
                  Select All
                </Button>
                {selectedIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-muted-foreground hover:text-foreground"
                    testId={buildTestId(testId, 'clear-selection')}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
            {showViewToggle && (
              <div
                className="flex items-center gap-1 rounded-lg border p-1"
                data-testid={buildTestId(testId, 'view-toggle')}
              >
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  testId={buildTestId(testId, 'view-grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                  title="List view"
                  testId={buildTestId(testId, 'view-list')}
                >
                  <Rows3 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Collection Filter Header (optional) */}
        {collectionFilterHeader}

        {/* Products Grid or List */}
        {viewMode === 'grid' ? (
          <div
            className="grid gap-4 p-6 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            data-testid={buildTestId(testId, 'grid')}
          >
          {filteredProducts.map((product, index) => (
            <ProductGridCard
              key={product.id}
              product={product}
              isSelected={selectedIds.includes(product.id)}
              onSelect={() => toggleProduct(product.id)}
              onProductClick={onProductClick ? () => onProductClick(product) : undefined}
              onSceneTypeChange={onSceneTypeChange ? (sceneType) => onSceneTypeChange(product.id, sceneType) : undefined}
              selectionMode={selectionMode}
              showGeneratedAssets={showGeneratedAssets}
              index={index}
              allSceneTypes={sceneTypes}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-6 pb-8" data-testid={buildTestId(testId, 'list')}>
          {filteredProducts.map((product) => (
            <ProductListRow
              key={product.id}
              product={product}
              isSelected={selectedIds.includes(product.id)}
              onSelect={() => toggleProduct(product.id)}
              onProductClick={onProductClick ? () => onProductClick(product) : undefined}
              onSceneTypeChange={onSceneTypeChange ? (sceneType) => onSceneTypeChange(product.id, sceneType) : undefined}
              selectionMode={selectionMode}
              showGeneratedAssets={showGeneratedAssets}
              height={listRowHeight}
              allSceneTypes={sceneTypes}
            />
          ))}
        </div>
      )}

        {filteredProducts.length === 0 && (
          <div
            className="animate-fade-in py-16 text-center opacity-0"
            data-testid={buildTestId(testId, 'no-results')}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No products found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
