'use client';

import { useState } from 'react';
import {
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Home,
  Briefcase,
  Bed,
  Utensils,
  Sofa,
  TreePine,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MAX_TAGS = 12;

interface SceneTypeConfig {
  id: string;
  name: string;
  icon?: React.ElementType;
  productCount: number;
  tags: string[]; // Simple flat array of tags
}

interface CollectionConfigPanelProps {
  sceneTypes: SceneTypeConfig[];
  collectionTags: string[]; // Simple flat array derived from inspiration analysis
  onUpdateSceneTags: (sceneId: string, tags: string[]) => void;
  onUpdateCollectionTags: (tags: string[]) => void;
  className?: string;
}

const SCENE_ICONS: Record<string, React.ElementType> = {
  office: Briefcase,
  bedroom: Bed,
  'living room': Sofa,
  'dining room': Utensils,
  outdoor: TreePine,
  default: Home,
};

// Default tags that apply to all scene types
const DEFAULT_SCENE_TAGS = ['high quality', 'realistic lighting', 'professional'];

// Scene-specific default tags
const SCENE_DEFAULT_TAGS: Record<string, string[]> = {
  office: ['indoor', 'workspace', 'productive'],
  bedroom: ['indoor', 'cozy', 'relaxing'],
  'living room': ['indoor', 'comfortable', 'welcoming'],
  'dining room': ['indoor', 'elegant', 'social'],
  outdoor: ['outdoor', 'natural light', 'fresh'],
};

export function CollectionConfigPanel({
  sceneTypes,
  collectionTags,
  onUpdateSceneTags,
  onUpdateCollectionTags,
  className,
}: CollectionConfigPanelProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [showCollectionTags, setShowCollectionTags] = useState(true);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

  const toggleScene = (sceneId: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  };

  const handleRemoveCollectionTag = (tag: string) => {
    onUpdateCollectionTags(collectionTags.filter((t) => t !== tag));
  };

  const handleAddCollectionTag = () => {
    const newTag = newTagInputs['collection']?.trim();
    if (!newTag || collectionTags.length >= MAX_TAGS) return;
    if (!collectionTags.includes(newTag)) {
      onUpdateCollectionTags([...collectionTags, newTag]);
    }
    setNewTagInputs((prev) => ({ ...prev, collection: '' }));
  };

  const handleRemoveSceneTag = (sceneId: string, tag: string) => {
    const scene = sceneTypes.find((s) => s.id === sceneId);
    if (scene) {
      onUpdateSceneTags(
        sceneId,
        scene.tags.filter((t) => t !== tag)
      );
    }
  };

  const handleAddSceneTag = (sceneId: string) => {
    const inputKey = `scene-${sceneId}`;
    const newTag = newTagInputs[inputKey]?.trim();
    if (!newTag) return;

    const scene = sceneTypes.find((s) => s.id === sceneId);
    if (scene && scene.tags.length < MAX_TAGS && !scene.tags.includes(newTag)) {
      onUpdateSceneTags(sceneId, [...scene.tags, newTag]);
    }
    setNewTagInputs((prev) => ({ ...prev, [inputKey]: '' }));
  };

  return (
    <div className={cn('space-y-4 p-4', className)}>
      {/* Scene Types - First */}
      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Scene Types
          <span className="text-xs font-normal text-muted-foreground">({sceneTypes.length})</span>
        </h4>

        {sceneTypes.map((scene) => {
          const Icon = scene.icon || SCENE_ICONS[scene.name.toLowerCase()] || SCENE_ICONS.default;
          const isExpanded = expandedScenes.has(scene.id);
          const inputKey = `scene-${scene.id}`;

          return (
            <Card key={scene.id} className="bg-card/50">
              <CardHeader className="cursor-pointer py-2.5" onClick={() => toggleScene(scene.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{scene.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {scene.productCount} products
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {scene.tags.length} tags
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="border-t border-border/50 pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {scene.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="group pr-1 text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSceneTag(scene.id, tag);
                          }}
                          className="ml-1 opacity-50 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {scene.tags.length < MAX_TAGS && (
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Add..."
                          value={newTagInputs[inputKey] || ''}
                          onChange={(e) =>
                            setNewTagInputs((prev) => ({ ...prev, [inputKey]: e.target.value }))
                          }
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddSceneTag(scene.id);
                            }
                          }}
                          className="h-6 w-20 px-2 text-xs"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSceneTag(scene.id);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Collection Tags - Derived from inspiration analysis */}
      <Card className="bg-card/50">
        <CardHeader
          className="cursor-pointer py-3"
          onClick={() => setShowCollectionTags(!showCollectionTags)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-primary" />
              Collection Tags
            </CardTitle>
            {showCollectionTags ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Derived from your inspiration images & prompt
          </p>
        </CardHeader>
        {showCollectionTags && (
          <CardContent className="border-t border-border/50 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {collectionTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="group pr-1 text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveCollectionTag(tag)}
                    className="ml-1 opacity-50 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {collectionTags.length < MAX_TAGS && (
                <div className="flex items-center gap-1">
                  <Input
                    placeholder="Add..."
                    value={newTagInputs['collection'] || ''}
                    onChange={(e) =>
                      setNewTagInputs((prev) => ({ ...prev, collection: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCollectionTag();
                      }
                    }}
                    className="h-6 w-20 px-2 text-xs"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={handleAddCollectionTag}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {collectionTags.length === 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Tags will be generated from your inspiration images
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export { DEFAULT_SCENE_TAGS, SCENE_DEFAULT_TAGS };
export type { SceneTypeConfig };
