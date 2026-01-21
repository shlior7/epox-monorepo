import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavContext } from '../../core/types';
import { toggleInSet } from '../../services/selection.service';
import { STUDIO_PRODUCTS_EVENTS, type SortOption } from './constants';
import type { StudioProductsViewModel, ProductDragData, ProductCategoryKey } from './types';

const UNCATEGORIZED: ProductCategoryKey = 'uncategorized';

const normalizeCategory = (value?: string): ProductCategoryKey => {
  const normalized = value?.trim().toLowerCase();
  return normalized || UNCATEGORIZED;
};

export function useStudioProductsView(ctx: NavContext) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategoryKey | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('category');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const client = useMemo(
    () => ctx.services.data.clients.find((item) => item.id === ctx.selection.clientId) ?? null,
    [ctx.services.data.clients, ctx.selection.clientId]
  );

  // Reset state when client changes
  useEffect(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setSelectedProductIds(new Set());
    setExpandedProductIds(new Set());
    setIsMultiSelectMode(false);
  }, [ctx.selection.clientId]);

  // Subscribe to events
  useEffect(() => {
    const unsubscribeMultiSelect = ctx.shell.events.subscribe(STUDIO_PRODUCTS_EVENTS.TOGGLE_MULTI_SELECT, () => {
      setIsMultiSelectMode((prev) => {
        const next = !prev;
        if (!next) {
          setSelectedProductIds(new Set());
        }
        return next;
      });
    });

    const unsubscribeCancel = ctx.shell.events.subscribe(STUDIO_PRODUCTS_EVENTS.CANCEL_MODES, () => {
      setIsMultiSelectMode(false);
      setSelectedProductIds(new Set());
    });

    return () => {
      unsubscribeMultiSelect();
      unsubscribeCancel();
    };
  }, [ctx.shell.events]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!client) return [];

    let products = [...client.products];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      products = products.filter((p) => p.name.toLowerCase().includes(query));
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      products = products.filter((p) => normalizeCategory(p.category) === categoryFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'name-asc':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        products.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'recent':
        products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'category':
        // Will be handled by productsByCategory grouping
        break;
    }

    return products;
  }, [client, searchQuery, categoryFilter, sortBy]);

  const categoryOptions = useMemo((): ProductCategoryKey[] => {
    if (!client) return [];
    const categoriesFromProducts = client.products
      .map((product) => normalizeCategory(product.category))
      .filter((category) => category !== UNCATEGORIZED);
    const baseCategories = client.categories?.length ? client.categories : categoriesFromProducts;
    const normalizedCategories = Array.from(new Set(baseCategories.map((category) => category.trim().toLowerCase()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    );
    const hasUncategorized = client.products.some((product) => !product.category);

    return hasUncategorized ? [...normalizedCategories, UNCATEGORIZED] : normalizedCategories;
  }, [client]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped = new Map<ProductCategoryKey, typeof filteredProducts>();

    filteredProducts.forEach((product) => {
      const category = normalizeCategory(product.category);
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(product);
    });

    const orderedCategories = categoryOptions.length > 0 ? categoryOptions : Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));
    const sortedGroups: { category: ProductCategoryKey; products: typeof filteredProducts }[] = [];

    orderedCategories.forEach((category) => {
      if (grouped.has(category)) {
        sortedGroups.push({ category, products: grouped.get(category)! });
      }
    });

    if (grouped.has(UNCATEGORIZED) && !orderedCategories.includes(UNCATEGORIZED)) {
      sortedGroups.push({ category: UNCATEGORIZED, products: grouped.get(UNCATEGORIZED)! });
    }

    return sortedGroups;
  }, [categoryOptions, filteredProducts]);

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProductIds((prev) => toggleInSet(prev, productId));
  }, []);

  const toggleProductExpanded = useCallback((productId: string) => {
    setExpandedProductIds((prev) => toggleInSet(prev, productId));
  }, []);

  const cancelMultiSelect = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedProductIds(new Set());
    ctx.shell.events.emit(STUDIO_PRODUCTS_EVENTS.CANCEL_MODES);
  }, [ctx.shell.events]);

  // Get drag data for selected products (for multi-drag)
  const getSelectedProductsDragData = useCallback((): ProductDragData[] => {
    if (!client) return [];

    return Array.from(selectedProductIds).map((productId) => {
      const product = client.products.find((p) => p.id === productId);
      const imageId = product?.productImageIds[0] ?? '';
      return { productId, imageId };
    });
  }, [client, selectedProductIds]);

  const model: StudioProductsViewModel = useMemo(
    () => ({
      client,
      products: filteredProducts,
      productsByCategory,
      categoryOptions,
      searchQuery,
      categoryFilter,
      sortBy,
      selectedProductIds,
      expandedProductIds,
      isMultiSelectMode,
    }),
    [
      client,
      filteredProducts,
      productsByCategory,
      categoryOptions,
      searchQuery,
      categoryFilter,
      sortBy,
      selectedProductIds,
      expandedProductIds,
      isMultiSelectMode,
    ]
  );

  return {
    model,
    setSearchQuery,
    setCategoryFilter,
    setSortBy,
    toggleProductSelection,
    toggleProductExpanded,
    cancelMultiSelect,
    getSelectedProductsDragData,
  };
}
