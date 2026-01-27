'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StoreFilters } from './hooks/useStoreAssets';

interface StoreFiltersBarProps {
  filters: StoreFilters;
  onFiltersChange: (filters: StoreFilters) => void;
  collectionOptions?: Array<{ id: string; name: string }>;
}

export function StoreFiltersBar({
  filters,
  onFiltersChange,
  collectionOptions = [],
}: StoreFiltersBarProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value });
  };

  const handleSyncStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      syncStatus: value as StoreFilters['syncStatus'],
    });
  };

  const handleFavoriteFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      favoriteFilter: value as StoreFilters['favoriteFilter'],
    });
  };

  const handleCollectionChange = (value: string) => {
    onFiltersChange({
      ...filters,
      collectionId: value === 'all' ? undefined : value,
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-testid="store-filters-bar"
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search assets..."
          value={filters.search}
          onChange={handleSearchChange}
          className="pl-9"
          data-testid="store-search-input"
        />
      </div>

      {/* Sync Status Filter */}
      <Select value={filters.syncStatus} onValueChange={handleSyncStatusChange}>
        <SelectTrigger
          className="w-[140px]"
          testId="store-sync-status-filter"
        >
          <SelectValue placeholder="Sync status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="sync-status-all">
            All Status
          </SelectItem>
          <SelectItem value="synced" data-testid="sync-status-synced">
            Synced
          </SelectItem>
          <SelectItem value="not_synced" data-testid="sync-status-not-synced">
            Not Synced
          </SelectItem>
          <SelectItem value="failed" data-testid="sync-status-failed">
            Failed
          </SelectItem>
          <SelectItem value="pending" data-testid="sync-status-pending">
            Pending
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Favorite Filter */}
      <Select value={filters.favoriteFilter} onValueChange={handleFavoriteFilterChange}>
        <SelectTrigger
          className="w-[140px]"
          testId="store-favorite-filter"
        >
          <SelectValue placeholder="Favorites" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="favorite-all">
            All Assets
          </SelectItem>
          <SelectItem value="favorites_only" data-testid="favorite-only">
            Favorites Only
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Collection Filter */}
      {collectionOptions.length > 0 && (
        <Select
          value={filters.collectionId ?? 'all'}
          onValueChange={handleCollectionChange}
        >
          <SelectTrigger
            className="w-[180px]"
            testId="store-collection-filter"
          >
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="collection-all">
              All Products
            </SelectItem>
            {collectionOptions.map((collection) => (
              <SelectItem
                key={collection.id}
                value={collection.id}
                data-testid={`collection-${collection.id}`}
              >
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
