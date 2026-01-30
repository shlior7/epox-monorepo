'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { CategoryInfo } from './InspireSection';

// ===== PROPS =====

export interface AddSectionDropdownProps {
  categories: CategoryInfo[];
  sceneTypes: string[];
  onAdd: (categoryIds: string[], sceneTypes: string[]) => void;
  children: React.ReactNode;
}

// ===== COMPONENT =====

export function AddSectionDropdown({
  categories,
  sceneTypes,
  onAdd,
  children,
}: AddSectionDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedSceneTypes, setSelectedSceneTypes] = useState<Set<string>>(new Set());
  const [categorySearch, setCategorySearch] = useState('');
  const [sceneTypeSearch, setSceneTypeSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    const lower = categorySearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(lower));
  }, [categories, categorySearch]);

  const filteredSceneTypes = useMemo(() => {
    if (!sceneTypeSearch) return sceneTypes;
    const lower = sceneTypeSearch.toLowerCase();
    return sceneTypes.filter((st) => st.toLowerCase().includes(lower));
  }, [sceneTypes, sceneTypeSearch]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSceneType = (st: string) => {
    setSelectedSceneTypes((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(Array.from(selectedCategoryIds), Array.from(selectedSceneTypes));
    // Reset
    setSelectedCategoryIds(new Set());
    setSelectedSceneTypes(new Set());
    setCategorySearch('');
    setSceneTypeSearch('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[240px] p-0"
        align="start"
        data-testid={buildTestId('add-section-dropdown')}
      >
        <div className="p-3" data-testid={buildTestId('add-section-dropdown', 'categories')}>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Categories
          </p>
          {categories.length > 5 && (
            <Input
              placeholder="Search..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="mb-2 h-7 text-xs"
              data-testid={buildTestId('add-section-dropdown', 'category-search')}
            />
          )}
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {filteredCategories.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">No categories</p>
            )}
            {filteredCategories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selectedCategoryIds.has(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                  data-testid={buildTestId('add-section-dropdown', 'category', cat.id)}
                />
                <span className="text-xs truncate">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-2 flex justify-end">
          <Button
            size="sm"
            onClick={handleAdd}
            className="h-7 text-xs"
            data-testid={buildTestId('add-section-dropdown', 'add-button')}
          >
            Add Section
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
