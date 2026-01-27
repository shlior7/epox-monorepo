'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Briefcase, Bed, Sofa, UtensilsCrossed, Bath, TreePine, Building2, Camera } from 'lucide-react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';

// ===== SCENE TYPE ICONS =====

const SCENE_TYPE_ICONS: Record<string, React.ElementType> = {
  'Living Room': Sofa,
  'Bedroom': Bed,
  'Office': Briefcase,
  'Kitchen': UtensilsCrossed,
  'Dining Room': UtensilsCrossed,
  'Bathroom': Bath,
  'Outdoor': TreePine,
  'Urban': Building2,
  'Studio': Camera,
};

function getSceneTypeIcon(sceneType: string): React.ElementType {
  if (SCENE_TYPE_ICONS[sceneType]) {
    return SCENE_TYPE_ICONS[sceneType];
  }
  const lowerType = sceneType.toLowerCase();
  for (const [key, icon] of Object.entries(SCENE_TYPE_ICONS)) {
    if (lowerType.includes(key.toLowerCase())) {
      return icon;
    }
  }
  return Camera;
}

// ===== TYPES =====

export interface ThumbnailItem {
  id: string;
  sceneType: string;
  thumbnailUrl?: string;
  label?: string;
}

export interface SceneTypeNavGroup {
  sceneType: string;
  items: ThumbnailItem[];
}

// ===== PROPS =====

export interface SceneTypeThumbnailNavProps {
  items: ThumbnailItem[];
  activeSceneType?: string | null;
  selectedItemId?: string | null;
  onSceneTypeClick?: (sceneType: string) => void;
  onItemClick?: (item: ThumbnailItem) => void;
  className?: string;
}

// ===== COMPONENT =====

export function SceneTypeThumbnailNav({
  items,
  activeSceneType,
  selectedItemId,
  onSceneTypeClick,
  onItemClick,
  className,
}: SceneTypeThumbnailNavProps) {
  // Group items by scene type
  const groupedItems = useMemo(() => {
    const groups: Record<string, ThumbnailItem[]> = {};

    items.forEach((item) => {
      const sceneType = item.sceneType || 'Other';
      if (!groups[sceneType]) {
        groups[sceneType] = [];
      }
      groups[sceneType].push(item);
    });

    return Object.entries(groups)
      .map(([sceneType, items]) => ({ sceneType, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn('flex flex-col gap-4 overflow-y-auto p-2', className)}
      data-testid={buildTestId('scene-type-thumbnail-nav')}
    >
      {groupedItems.map(({ sceneType, items }) => {
        const Icon = getSceneTypeIcon(sceneType);
        const isActive = activeSceneType === sceneType;

        return (
          <div
            key={sceneType}
            className="space-y-1"
            data-testid={buildTestId('scene-type-thumbnail-nav', 'group', sceneType)}
          >
            {/* Scene Type Header */}
            <button
              onClick={() => onSceneTypeClick?.(sceneType)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              data-testid={buildTestId('scene-type-thumbnail-nav', 'header', sceneType)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="flex-1 truncate text-left">{sceneType}</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                {items.length}
              </span>
            </button>

            {/* Thumbnails */}
            <div className="flex flex-wrap gap-1 pl-5">
              {items.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className={cn(
                    'relative h-8 w-8 overflow-hidden rounded-md border-2 transition-all',
                    selectedItemId === item.id
                      ? 'border-primary ring-1 ring-primary/20'
                      : 'border-transparent hover:border-primary/50'
                  )}
                  data-testid={buildTestId('scene-type-thumbnail-nav', 'item', item.id)}
                >
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.label || 'Thumbnail'}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
              {items.length > 4 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                  +{items.length - 4}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
