'use client';

import { useState } from 'react';
import { ChevronDown, Briefcase, Bed, Sofa, UtensilsCrossed, Bath, TreePine, Building2, Camera } from 'lucide-react';
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

// ===== PROPS =====

export interface SceneTypeSectionProps {
  sceneType: string;
  productCount: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isActive?: boolean;
  className?: string;
}

// ===== COMPONENT =====

export function SceneTypeSection({
  sceneType,
  productCount,
  children,
  defaultExpanded = true,
  isActive = false,
  className,
}: SceneTypeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const Icon = getSceneTypeIcon(sceneType);

  return (
    <section
      className={cn(
        'rounded-lg border transition-colors',
        isActive ? 'border-primary/50 bg-primary/5' : 'border-border',
        className
      )}
      data-scene-type={sceneType}
      data-testid={buildTestId('scene-type-section', sceneType)}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-4"
        data-testid={buildTestId('scene-type-section', 'header', sceneType)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-medium">{sceneType}</h3>
          <p className="text-xs text-muted-foreground">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          className="border-t border-border p-4"
          data-testid={buildTestId('scene-type-section', 'content', sceneType)}
        >
          {children}
        </div>
      )}
    </section>
  );
}
