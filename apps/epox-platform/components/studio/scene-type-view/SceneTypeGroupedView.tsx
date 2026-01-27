'use client';

import { useMemo, forwardRef } from 'react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { SceneTypeSection } from './SceneTypeSection';

// ===== TYPES =====

export interface ProductItem {
  id: string;
  name: string;
  sceneType: string;
  thumbnailUrl?: string;
}

export interface SceneTypeGroup {
  sceneType: string;
  products: ProductItem[];
}

// ===== PROPS =====

export interface SceneTypeGroupedViewProps {
  products: ProductItem[];
  activeSceneType?: string | null;
  renderProduct: (product: ProductItem) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

// ===== COMPONENT =====

export const SceneTypeGroupedView = forwardRef<HTMLDivElement, SceneTypeGroupedViewProps>(
  function SceneTypeGroupedView(
    { products, activeSceneType, renderProduct, emptyState, className },
    ref
  ) {
    // Group products by scene type
    const groupedProducts = useMemo(() => {
      const groups: Record<string, ProductItem[]> = {};

      products.forEach((product) => {
        const sceneType = product.sceneType || 'Other';
        if (!groups[sceneType]) {
          groups[sceneType] = [];
        }
        groups[sceneType].push(product);
      });

      // Convert to array and sort by product count (most products first)
      return Object.entries(groups)
        .map(([sceneType, products]) => ({ sceneType, products }))
        .sort((a, b) => b.products.length - a.products.length);
    }, [products]);

    if (products.length === 0) {
      return (
        <div
          className={cn('flex items-center justify-center p-8', className)}
          data-testid={buildTestId('scene-type-grouped-view', 'empty')}
        >
          {emptyState || (
            <p className="text-sm text-muted-foreground">
              No products to display
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('space-y-4 overflow-y-auto', className)}
        data-testid={buildTestId('scene-type-grouped-view')}
      >
        {groupedProducts.map(({ sceneType, products }) => (
          <SceneTypeSection
            key={sceneType}
            sceneType={sceneType}
            productCount={products.length}
            isActive={activeSceneType === sceneType}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  data-testid={buildTestId('scene-type-grouped-view', 'product', product.id)}
                >
                  {renderProduct(product)}
                </div>
              ))}
            </div>
          </SceneTypeSection>
        ))}
      </div>
    );
  }
);
