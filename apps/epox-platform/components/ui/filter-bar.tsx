'use client';

import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface FilterOption {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
}

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onFilterChange?: (key: string, value: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onFilterChange,
  onClearAll,
  className,
}: FilterBarProps) {
  const activeFilterCount = filters.filter((f) => f.value && f.value !== 'all').length;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row', className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value}
            onValueChange={(value) => onFilterChange?.(filter.key, value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.label}</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Clear All Button */}
        {(activeFilterCount > 0 || searchQuery) && onClearAll && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <X className="mr-1 h-4 w-4" />
            Clear{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        )}
      </div>
    </div>
  );
}
