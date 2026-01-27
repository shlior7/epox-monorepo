'use client';

import { X, Upload, Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionBarProps {
  selectedCount: number;
  onSync: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isSyncing?: boolean;
  testId?: string;
}

export function BulkActionBar({
  selectedCount,
  onSync,
  onFavorite,
  onDelete,
  onClearSelection,
  isSyncing = false,
  testId = 'bulk-action-bar',
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-background border rounded-lg shadow-lg"
      data-testid={testId}
    >
      {/* Selection Count */}
      <div className="flex items-center gap-2 pr-3 border-r">
        <span className="text-sm font-medium" data-testid={`${testId}-count`}>
          {selectedCount} {selectedCount === 1 ? 'asset' : 'assets'} selected
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClearSelection}
          data-testid={`${testId}-clear-btn`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          data-testid={`${testId}-sync-btn`}
        >
          <Upload className="h-4 w-4 mr-2" />
          Sync to Store
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onFavorite}
          data-testid={`${testId}-favorite-btn`}
        >
          <Heart className="h-4 w-4 mr-2" />
          Favorite
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          data-testid={`${testId}-delete-btn`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}
