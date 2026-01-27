'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Link2,
  Store,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { StoreProductView, GeneratedAssetWithSync, ProductImage } from 'visualizer-types';
import { StoreAssetCard } from './StoreAssetCard';
import { ProductMappingModal } from './modals/ProductMappingModal';

// Extended type with URL from API transformation
interface ProductImageWithUrl extends ProductImage {
  url: string;
}

// Extended StoreProductView with URL-enriched base images
export interface StoreProductViewWithUrls extends Omit<StoreProductView, 'baseImages'> {
  baseImages: ProductImageWithUrl[];
}

interface ProductAssetsGroupProps {
  productView: StoreProductViewWithUrls;
  selectedAssetIds: Set<string>;
  onSelectAsset: (assetId: string, selected: boolean) => void;
  onSyncAsset: (assetId: string, productId: string) => void;
  onUnsyncAsset: (assetId: string, productId: string) => void;
  onToggleFavorite: (assetId: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onAssetEdited?: () => void;
  syncingAssetIds: Set<string>;
  testId?: string;
}

export function ProductAssetsGroup({
  productView,
  selectedAssetIds,
  onSelectAsset,
  onSyncAsset,
  onUnsyncAsset,
  onToggleFavorite,
  onDeleteAsset,
  onAssetEdited,
  syncingAssetIds,
  testId,
}: ProductAssetsGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  const {
    product,
    baseImages,
    isMappedToStore,
    syncedAssets,
    unsyncedAssets,
    syncedCount,
    unsyncedCount,
    totalAssetCount,
  } = productView;

  const handleMapProduct = useCallback(() => {
    setIsMappingModalOpen(true);
  }, []);

  // Check if product was imported from store
  const isFromStore = product.source === 'imported';

  // Calculate total items in "synced" section (base images + synced assets)
  const syncedSectionCount = baseImages.length + syncedAssets.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} data-testid={testId}>
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div
            className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            data-testid={`${testId}-header`}
          >
            {/* Expand/Collapse Icon */}
            <div className="text-muted-foreground">
              {isOpen ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="font-semibold text-lg truncate hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`${testId}-name`}
                >
                  {product.name}
                </Link>
                {isMappedToStore ? (
                  <Badge
                    variant="secondary"
                    className="gap-1"
                    data-testid={`${testId}-mapped-badge`}
                  >
                    <Link2 className="h-3 w-3" />
                    Mapped
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 text-amber-600 border-amber-300"
                    data-testid={`${testId}-unmapped-badge`}
                  >
                    Not mapped
                  </Badge>
                )}
              </div>

              {/* Store Product Link */}
              {product.storeUrl && (
                <a
                  href={product.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`${testId}-store-link`}
                >
                  <span className="truncate max-w-[200px]">
                    {product.storeName || 'View in store'}
                  </span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {syncedSectionCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  data-testid={`${testId}-synced-count`}
                >
                  {syncedSectionCount} in store
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {/* View Product Button */}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex-row"
                data-testid={`${testId}-view-btn`}
              >
                <Link href={product.storeUrl || `/products/${product.id}`} className="inline-flex items-center gap-1">
                  <span>View Product</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              {/* Map Product Button */}
              {!isMappedToStore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMapProduct}
                  data-testid={`${testId}-map-btn`}
                >
                  Map to Store
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Content - Two Sections */}
        <CollapsibleContent>
          <div className="px-4 pb-4" data-testid={`${testId}-content`}>
            {/* Section 1: In Store (Base Images + Synced Assets) */}
            {syncedSectionCount > 0 && (
              <div data-testid={`${testId}-synced-section`}>
                <div className="flex items-center gap-2 mb-3">
                  <Store className={cn("h-4 w-4", isMappedToStore ? "text-green-600" : "text-muted-foreground")} />
                  <span className={cn(
                    "text-sm font-medium",
                    isMappedToStore
                      ? "text-green-700 dark:text-green-400"
                      : "text-muted-foreground"
                  )}>
                    {isMappedToStore ? `In Store (${syncedSectionCount})` : `Base Images (${syncedSectionCount})`}
                  </span>
                </div>
                <div
                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3"
                  data-testid={`${testId}-synced-grid`}
                >
                  {/* Base Images */}
                  {baseImages.map((image, index) => (
                    <StoreAssetCard
                      key={image.id}
                      imageUrl={image.url || ''}
                      imageId={image.id}
                      productId={image.productId}
                      imageType="base"
                      syncStatus="synced"
                      isPrimary={image.isPrimary}
                      onImageEdited={onAssetEdited}
                      testId={`${testId}-base-image-${index}`}
                    />
                  ))}

                  {/* Synced Generated Assets */}
                  {syncedAssets.map((asset, index) => (
                    <StoreAssetCard
                      key={asset.id}
                      imageUrl={asset.assetUrl}
                      imageId={asset.id}
                      imageType="generated"
                      isFavorite={asset.isFavorite}
                      syncStatus={asset.syncStatus}
                      syncError={asset.syncError}
                      onSync={() => onSyncAsset(asset.id, product.id)}
                      onUnsync={() => onUnsyncAsset(asset.id, product.id)}
                      onToggleFavorite={() => onToggleFavorite(asset.id)}
                      onDelete={() => onDeleteAsset(asset.id)}
                      onImageEdited={onAssetEdited}
                      isSyncing={syncingAssetIds.has(asset.id)}
                      testId={`${testId}-synced-asset-${index}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            {syncedSectionCount > 0 && unsyncedCount > 0 && (
              <Separator className="my-4" />
            )}

            {/* Section 2: Generated Assets (Not Yet Synced) */}
            {unsyncedCount > 0 && (
              <div data-testid={`${testId}-unsynced-section`}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                    Generated Assets ({unsyncedCount})
                  </span>
                  {!isMappedToStore && (
                    <span className="text-xs text-muted-foreground">
                      • Map product to enable sync
                    </span>
                  )}
                </div>
                <div
                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3"
                  data-testid={`${testId}-unsynced-grid`}
                >
                  {unsyncedAssets.map((asset, index) => (
                    <StoreAssetCard
                      key={asset.id}
                      imageUrl={asset.assetUrl}
                      imageId={asset.id}
                      imageType="generated"
                      isFavorite={asset.isFavorite}
                      syncStatus={asset.syncStatus}
                      syncError={asset.syncError}
                      onSync={isMappedToStore ? () => onSyncAsset(asset.id, product.id) : undefined}
                      onUnsync={() => onUnsyncAsset(asset.id, product.id)}
                      onToggleFavorite={() => onToggleFavorite(asset.id)}
                      onDelete={() => onDeleteAsset(asset.id)}
                      onImageEdited={onAssetEdited}
                      isSyncing={syncingAssetIds.has(asset.id)}
                      testId={`${testId}-unsynced-asset-${index}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {syncedSectionCount === 0 && unsyncedCount === 0 && baseImages.length === 0 && (
              <div
                className="text-center py-8 text-muted-foreground"
                data-testid={`${testId}-empty`}
              >
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No images or assets yet</p>
                <Link
                  href={`/studio?product=${product.id}`}
                  className="text-sm text-primary hover:underline mt-1 inline-block"
                >
                  Generate assets in Studio →
                </Link>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>

      {/* Product Mapping Modal */}
      <ProductMappingModal
        open={isMappingModalOpen}
        onOpenChange={setIsMappingModalOpen}
        productId={product.id}
        productName={product.name}
        currentStoreId={product.storeId ?? undefined}
        currentStoreName={product.storeName ?? undefined}
        testId={`${testId}-mapping-modal`}
      />
    </Collapsible>
  );
}
