'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProductGrid } from '@/components/studio/ProductGrid';

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

      {/* Products Grid */}
      <ProductGrid
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        showViewToggle={false}
        viewMode="grid"
        selectionMode="card"
        emptyStateMessage="No products available. Please add products to your catalog first."
      />
    </div>
  );
}
