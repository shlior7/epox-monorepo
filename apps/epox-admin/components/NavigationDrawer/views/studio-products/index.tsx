'use client';

import React, { useCallback } from 'react';
import clsx from 'clsx';
import { Search, ChevronDown, ChevronRight, Package } from 'lucide-react';
import type { NavContext } from '../../core/types';
import type { Product } from '@/lib/types/app-types';
import { BulkBar } from '../../core/components/BulkBar';
import { Checkbox } from '../../components/Checkbox';
import { EmptyState } from '../../components/EmptyState';
import * as S3Service from '@/lib/services/s3/browser';
import styles from '../../NavigationDrawer.module.scss';
import { SORT_OPTIONS } from './constants';
import { useStudioProductsView } from './useStudioProductsView';
import type { ProductDragData, MultiProductDragData, ProductCategoryKey } from './types';

const MAX_VISIBLE_IMAGES = 3;

export function StudioProductsView({ ctx }: { ctx: NavContext }) {
  const {
    model,
    setSearchQuery,
    setCategoryFilter,
    setSortBy,
    toggleProductSelection,
    toggleProductExpanded,
    cancelMultiSelect,
    getSelectedProductsDragData,
  } = useStudioProductsView(ctx);

  const { focusedIndex, listItemRefs } = ctx.keyboard;

  const getProductImageUrl = useCallback(
    (productId: string, imageId: string): string => {
      if (!model.client) return '';
      return S3Service.getImageUrl(S3Service.S3Paths.getProductImageBasePath(model.client.id, productId, imageId));
    },
    [model.client]
  );

  const getCategoryLabel = (category: ProductCategoryKey): string => {
    if (category === 'uncategorized') return 'Uncategorized';
    return category;
  };

  const handleProductDragStart = useCallback(
    (e: React.DragEvent, productId: string, imageId: string) => {
      if (model.isMultiSelectMode && model.selectedProductIds.size > 0) {
        // Multi-drag: include all selected products
        const dragData: MultiProductDragData = {
          products: getSelectedProductsDragData(),
          sourceType: 'panel',
        };
        e.dataTransfer.setData('application/x-products', JSON.stringify(dragData));
      } else {
        // Single drag
        const dragData: ProductDragData = { productId, imageId };
        e.dataTransfer.setData('application/x-product', JSON.stringify(dragData));
      }
      e.dataTransfer.effectAllowed = 'copy';
    },
    [model.isMultiSelectMode, model.selectedProductIds, getSelectedProductsDragData]
  );

  const handleImageDragStart = useCallback((e: React.DragEvent, productId: string, imageId: string) => {
    const dragData: ProductDragData = { productId, imageId };
    e.dataTransfer.setData('application/x-product', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  if (!model.client) {
    return <EmptyState message="Select a client to view products." onAdd={ctx.callbacks.onAddClient} addLabel="Add Client" />;
  }

  if (model.client.products.length === 0) {
    return (
      <EmptyState
        message="No products available. Add products to start creating flows."
        onAdd={() => ctx.callbacks.onAddProduct(model.client!.id)}
        addLabel="Add Product"
      />
    );
  }

  const totalItems = model.products.length;
  listItemRefs.current = listItemRefs.current.slice(0, totalItems);

  return (
    <div className={styles.studioProductsContainer}>
      {/* Filter/Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search products..."
            value={model.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterControls}>
          <select
            value={model.categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ProductCategoryKey | 'all')}
            className={styles.filterSelect}
          >
            <option value="all">All Categories</option>
            {model.categoryOptions.map((category) => (
              <option key={category} value={category}>
                {getCategoryLabel(category)}
              </option>
            ))}
          </select>
          <select value={model.sortBy} onChange={(e) => setSortBy(e.target.value as typeof model.sortBy)} className={styles.filterSelect}>
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-select bulk bar */}
      {model.isMultiSelectMode && (
        <BulkBar
          mode="select"
          selectedCount={model.selectedProductIds.size}
          onConfirm={() => {
            // Drag to create flows - just close multi-select mode
            cancelMultiSelect();
          }}
          onCancel={cancelMultiSelect}
          confirmLabel="Done"
        />
      )}

      {/* Products List */}
      {model.products.length === 0 ? (
        <div className={styles.noResults}>
          <Package size={24} />
          <p>No products match your search.</p>
        </div>
      ) : (
        <div className={styles.productsList}>
          {model.sortBy === 'category'
            ? // Grouped by category
              model.productsByCategory.map(({ category, products }) => (
                <div key={category} className={styles.productTypeGroup}>
                  <div className={styles.productTypeHeader}>{getCategoryLabel(category)}</div>
                  {products.map((product, index) => (
                    <ProductPanelItem
                      key={product.id}
                      product={product}
                      clientId={model.client!.id}
                      isExpanded={model.expandedProductIds.has(product.id)}
                      isSelected={model.selectedProductIds.has(product.id)}
                      isMultiSelectMode={model.isMultiSelectMode}
                      onToggleExpand={() => toggleProductExpanded(product.id)}
                      onToggleSelect={() => toggleProductSelection(product.id)}
                      onDragStart={handleProductDragStart}
                      onImageDragStart={handleImageDragStart}
                      getImageUrl={getProductImageUrl}
                      focusedIndex={focusedIndex}
                      itemIndex={index}
                      listItemRefs={listItemRefs}
                    />
                  ))}
                </div>
              ))
            : // Flat list
              model.products.map((product, index) => (
                <ProductPanelItem
                  key={product.id}
                  product={product}
                  clientId={model.client!.id}
                  isExpanded={model.expandedProductIds.has(product.id)}
                  isSelected={model.selectedProductIds.has(product.id)}
                  isMultiSelectMode={model.isMultiSelectMode}
                  onToggleExpand={() => toggleProductExpanded(product.id)}
                  onToggleSelect={() => toggleProductSelection(product.id)}
                  onDragStart={handleProductDragStart}
                  onImageDragStart={handleImageDragStart}
                  getImageUrl={getProductImageUrl}
                  focusedIndex={focusedIndex}
                  itemIndex={index}
                  listItemRefs={listItemRefs}
                />
              ))}
        </div>
      )}

      {/* Drag hint */}
      <div className={styles.dragHint}>Drag products to the studio to create flows</div>
    </div>
  );
}

interface ProductPanelItemProps {
  product: Product;
  clientId: string;
  isExpanded: boolean;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onDragStart: (e: React.DragEvent, productId: string, imageId: string) => void;
  onImageDragStart: (e: React.DragEvent, productId: string, imageId: string) => void;
  getImageUrl: (productId: string, imageId: string) => string;
  focusedIndex: number;
  itemIndex: number;
  listItemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
}

function ProductPanelItem({
  product,
  clientId,
  isExpanded,
  isSelected,
  isMultiSelectMode,
  onToggleExpand,
  onToggleSelect,
  onDragStart,
  onImageDragStart,
  getImageUrl,
  focusedIndex,
  itemIndex,
  listItemRefs,
}: ProductPanelItemProps) {
  const imageIds = product.productImageIds || [];
  const hasOverflow = imageIds.length > MAX_VISIBLE_IMAGES;
  const visibleImages = isExpanded ? imageIds : imageIds.slice(0, MAX_VISIBLE_IMAGES);
  const overflowCount = imageIds.length - MAX_VISIBLE_IMAGES;
  const defaultImageId = imageIds[0] || '';

  return (
    <div
      ref={(el) => {
        if (el) listItemRefs.current[itemIndex] = el;
      }}
      className={clsx(styles.productPanelItem, {
        [styles.expanded]: isExpanded,
        [styles.selected]: isSelected,
      })}
      draggable={!isMultiSelectMode}
      onDragStart={(e) => onDragStart(e, product.id, defaultImageId)}
      tabIndex={itemIndex === focusedIndex ? 0 : -1}
    >
      <div className={styles.productPanelHeader}>
        {isMultiSelectMode && (
          <div className={styles.productCheckbox} onClick={onToggleSelect}>
            <Checkbox checked={isSelected} />
          </div>
        )}
        <div className={styles.productName}>{product.name}</div>
        <div className={styles.productImagesRow}>
          {visibleImages.map((imageId) => (
            <div
              key={imageId}
              className={styles.productImageThumb}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                onImageDragStart(e, product.id, imageId);
              }}
              title={`Drag to add ${product.name} with this image`}
            >
              <img src={getImageUrl(product.id, imageId)} alt={product.name} loading="lazy" draggable={false} />
            </div>
          ))}
          {hasOverflow && !isExpanded && (
            <button
              className={styles.overflowButton}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              title={`Show ${overflowCount} more images`}
            >
              +{overflowCount}
            </button>
          )}
          {imageIds.length > MAX_VISIBLE_IMAGES && (
            <button
              className={styles.expandToggle}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
      </div>
      {isExpanded && imageIds.length > MAX_VISIBLE_IMAGES && (
        <div className={styles.productImagesExpanded}>
          {imageIds.map((imageId) => (
            <div
              key={imageId}
              className={styles.productImageThumbLarge}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                onImageDragStart(e, product.id, imageId);
              }}
              title={`Drag to add ${product.name} with this image`}
            >
              <img src={getImageUrl(product.id, imageId)} alt={product.name} loading="lazy" draggable={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
