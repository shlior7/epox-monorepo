'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Sparkles,
  Lightbulb,
  Camera,
  Heart,
  Package,
  ImageIcon,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BubbleValue, BubbleType } from 'visualizer-types';
import type { CategoryGenerationSettings, SceneTypeGenerationSettings } from 'visualizer-types';

// ===== BUBBLE PRESETS (matching bubble-modals.tsx) =====

const STYLE_PRESETS = [
  'Modern', 'Minimalist', 'Industrial', 'Scandinavian', 'Bohemian',
  'Mid-Century', 'Contemporary', 'Traditional', 'Rustic', 'Eclectic',
];

const LIGHTING_PRESETS = [
  'Natural Daylight', 'Warm Evening', 'Studio Soft Light', 'Dramatic Side Light',
  'Sunset Glow', 'Morning Light', 'Overcast', 'Golden Hour',
];

const MOOD_PRESETS = [
  'Calm & Peaceful', 'Energetic & Vibrant', 'Cozy & Intimate',
  'Sophisticated', 'Playful', 'Serene', 'Dramatic', 'Fresh & Airy',
];

const CAMERA_ANGLE_PRESETS = [
  'Eye Level', "Bird's Eye View", 'Low Angle', 'Wide Shot',
  'Close-Up', '45° Angle', 'Isometric', 'Dutch Angle',
];

const HUMAN_INTERACTION_PRESETS = [
  { value: 'none', label: 'No People' },
  { value: 'partial', label: 'Partial (Hands/Arms)' },
  { value: 'full', label: 'Full Person' },
  { value: 'contextual', label: 'Contextual' },
];

const PROPS_PRESETS = [
  { value: 'none', label: 'No Props' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'styled', label: 'Styled / Curated' },
  { value: 'lifestyle', label: 'Lifestyle / Lived-in' },
];

const BUBBLE_TYPE_CONFIG: Record<string, { label: string; icon: typeof Sparkles; presets?: string[] }> = {
  style: { label: 'Style', icon: Sparkles, presets: STYLE_PRESETS },
  lighting: { label: 'Lighting', icon: Lightbulb, presets: LIGHTING_PRESETS },
  mood: { label: 'Mood', icon: Heart, presets: MOOD_PRESETS },
  'camera-angle': { label: 'Camera Angle', icon: Camera, presets: CAMERA_ANGLE_PRESETS },
  'human-interaction': { label: 'Human Interaction', icon: Package },
  props: { label: 'Props', icon: Package },
  background: { label: 'Background', icon: ImageIcon },
  'color-palette': { label: 'Color Palette', icon: Palette },
};

// ===== TYPES =====

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  generationSettings: CategoryGenerationSettings | null;
}

// ===== HELPER: Display text for a bubble =====

function getBubbleDisplayText(bubble: BubbleValue): string {
  if ('preset' in bubble && bubble.preset) return bubble.preset;
  if ('customValue' in bubble && bubble.customValue) return bubble.customValue;
  if ('colors' in bubble && bubble.colors?.length) return `${bubble.colors.length} colors`;
  return bubble.type;
}

// ===== MAIN COMPONENT =====

export default function CategorySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [category, setCategory] = useState<CategoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultBubbles, setDefaultBubbles] = useState<BubbleValue[]>([]);
  const [sceneTypeSettings, setSceneTypeSettings] = useState<Record<string, SceneTypeGenerationSettings>>({});

  // Add bubble dialog
  const [isAddBubbleOpen, setIsAddBubbleOpen] = useState(false);
  const [addBubbleTarget, setAddBubbleTarget] = useState<'default' | string>('default');

  // Add scene type dialog
  const [isAddSceneTypeOpen, setIsAddSceneTypeOpen] = useState(false);
  const [newSceneTypeName, setNewSceneTypeName] = useState('');

  // Edit bubble dialog
  const [editingBubble, setEditingBubble] = useState<{
    target: 'default' | string;
    index: number;
    bubble: BubbleValue;
  } | null>(null);

  const fetchCategory = useCallback(async () => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      const data = await response.json();
      const cat = data.category;
      setCategory(cat);
      setName(cat.name);
      setDescription(cat.description || '');
      setDefaultBubbles(cat.generationSettings?.defaultBubbles || []);
      setSceneTypeSettings(cat.generationSettings?.sceneTypeSettings || {});
    } catch (error) {
      console.error('Failed to fetch category:', error);
      toast.error('Failed to load category');
      router.push('/categories');
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, router]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsSaving(true);
    try {
      // Save name/description
      const updateResponse = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      if (!updateResponse.ok) throw new Error('Failed to update category');

      // Save generation settings
      const settingsResponse = await fetch(`/api/categories/${categoryId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultBubbles,
          sceneTypeSettings,
        }),
      });
      if (!settingsResponse.ok) throw new Error('Failed to update settings');

      toast.success('Category settings saved');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // ===== BUBBLE MANAGEMENT =====

  const addBubble = (type: BubbleType, target: 'default' | string) => {
    const newBubble: BubbleValue = { type } as BubbleValue;

    if (target === 'default') {
      setDefaultBubbles([...defaultBubbles, newBubble]);
    } else {
      setSceneTypeSettings((prev) => ({
        ...prev,
        [target]: {
          ...prev[target],
          defaultBubbles: [...(prev[target]?.defaultBubbles || []), newBubble],
        },
      }));
    }
    setIsAddBubbleOpen(false);

    // Open edit dialog for the new bubble
    const idx = target === 'default' ? defaultBubbles.length : (sceneTypeSettings[target]?.defaultBubbles?.length || 0);
    setEditingBubble({ target, index: idx, bubble: newBubble });
  };

  const updateBubble = (target: 'default' | string, index: number, bubble: BubbleValue) => {
    if (target === 'default') {
      const updated = [...defaultBubbles];
      updated[index] = bubble;
      setDefaultBubbles(updated);
    } else {
      setSceneTypeSettings((prev) => {
        const bubbles = [...(prev[target]?.defaultBubbles || [])];
        bubbles[index] = bubble;
        return {
          ...prev,
          [target]: { ...prev[target], defaultBubbles: bubbles },
        };
      });
    }
    setEditingBubble(null);
  };

  const removeBubble = (target: 'default' | string, index: number) => {
    if (target === 'default') {
      setDefaultBubbles(defaultBubbles.filter((_, i) => i !== index));
    } else {
      setSceneTypeSettings((prev) => ({
        ...prev,
        [target]: {
          ...prev[target],
          defaultBubbles: (prev[target]?.defaultBubbles || []).filter((_, i) => i !== index),
        },
      }));
    }
  };

  const addSceneType = () => {
    if (!newSceneTypeName.trim()) return;
    const key = newSceneTypeName.trim();
    if (sceneTypeSettings[key]) {
      toast.error('Scene type already exists');
      return;
    }
    setSceneTypeSettings((prev) => ({
      ...prev,
      [key]: {
        sceneType: key,
        defaultBubbles: [],
      },
    }));
    setNewSceneTypeName('');
    setIsAddSceneTypeOpen(false);
  };

  const removeSceneType = (key: string) => {
    setSceneTypeSettings((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // ===== LOADING STATE =====

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Category Settings" description="Loading..." />
        <div className="mx-auto max-w-3xl p-8">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3 mt-2" />
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!category) return null;

  return (
    <>
      <PageHeader
        title={`${category.name} Settings`}
        description="Configure default generation settings for this category"
        breadcrumb={
          <Link href="/categories" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to Categories
          </Link>
        }
        actions={
          <Button onClick={handleSave} disabled={isSaving} data-testid="save-category-settings-btn">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-6 p-8" data-testid="category-settings-page">
        {/* Basic Info */}
        <Card data-testid="category-basic-info-card">
          <CardHeader>
            <CardTitle>Category Details</CardTitle>
            <CardDescription>Basic information about this category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="category-name" className="text-sm font-medium">Name</label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                data-testid="category-name-input"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category-description" className="text-sm font-medium">Description</label>
              <Textarea
                id="category-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this category..."
                className="min-h-[80px]"
                data-testid="category-description-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Generation Settings */}
        <Card data-testid="category-default-bubbles-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Default Generation Settings</CardTitle>
                <CardDescription>
                  These settings apply to all products in this category by default
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddBubbleTarget('default');
                  setIsAddBubbleOpen(true);
                }}
                data-testid="add-default-bubble-btn"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BubbleList
              bubbles={defaultBubbles}
              onEdit={(index, bubble) => setEditingBubble({ target: 'default', index, bubble })}
              onRemove={(index) => removeBubble('default', index)}
              testIdPrefix="default-bubbles"
            />
          </CardContent>
        </Card>

        {/* Scene Type Settings */}
        <Card data-testid="category-scene-type-settings-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Scene Type Settings</CardTitle>
                <CardDescription>
                  Override defaults for specific scene types (e.g., Living Room, Office)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddSceneTypeOpen(true)}
                data-testid="add-scene-type-btn"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Scene Type
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(sceneTypeSettings).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6" data-testid="no-scene-types">
                No scene-type overrides configured. Add one to customize settings for specific rooms or environments.
              </p>
            ) : (
              Object.entries(sceneTypeSettings).map(([key, settings]) => (
                <div
                  key={key}
                  className="rounded-lg border p-4 space-y-3"
                  data-testid={`scene-type-${key}`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{key}</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAddBubbleTarget(key);
                          setIsAddBubbleOpen(true);
                        }}
                        data-testid={`scene-type-${key}-add-bubble`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Setting
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSceneType(key)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`scene-type-${key}-remove`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <BubbleList
                    bubbles={settings.defaultBubbles || []}
                    onEdit={(index, bubble) => setEditingBubble({ target: key, index, bubble })}
                    onRemove={(index) => removeBubble(key, index)}
                    testIdPrefix={`scene-type-${key}-bubbles`}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Generation Setting Dialog */}
      <Dialog open={isAddBubbleOpen} onOpenChange={setIsAddBubbleOpen}>
        <DialogContent data-testid="add-bubble-dialog">
          <DialogHeader>
            <DialogTitle>Add Generation Setting</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {Object.entries(BUBBLE_TYPE_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => addBubble(type as BubbleType, addBubbleTarget)}
                  className="flex items-center gap-2 rounded-lg border-2 border-border px-4 py-3 text-sm font-medium hover:border-primary/50 hover:bg-accent transition-all"
                  data-testid={`add-bubble-type-${type}`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Scene Type Dialog */}
      <Dialog open={isAddSceneTypeOpen} onOpenChange={setIsAddSceneTypeOpen}>
        <DialogContent data-testid="add-scene-type-dialog">
          <DialogHeader>
            <DialogTitle>Add Scene Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="e.g., Living Room, Office, Outdoor Patio"
              value={newSceneTypeName}
              onChange={(e) => setNewSceneTypeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSceneType()}
              data-testid="new-scene-type-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSceneTypeOpen(false)}>Cancel</Button>
            <Button onClick={addSceneType} disabled={!newSceneTypeName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bubble Dialog */}
      {editingBubble && (
        <BubbleEditDialog
          bubble={editingBubble.bubble}
          onSave={(updated) => updateBubble(editingBubble.target, editingBubble.index, updated)}
          onClose={() => setEditingBubble(null)}
        />
      )}
    </>
  );
}

// ===== BUBBLE LIST COMPONENT =====

function BubbleList({
  bubbles,
  onEdit,
  onRemove,
  testIdPrefix,
}: {
  bubbles: BubbleValue[];
  onEdit: (index: number, bubble: BubbleValue) => void;
  onRemove: (index: number) => void;
  testIdPrefix: string;
}) {
  if (bubbles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4" data-testid={`${testIdPrefix}-empty`}>
        No generation settings configured
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" data-testid={testIdPrefix}>
      {bubbles.map((bubble, index) => {
        const config = BUBBLE_TYPE_CONFIG[bubble.type];
        const Icon = config?.icon || Sparkles;
        return (
          <Badge
            key={`${bubble.type}-${index}`}
            variant="secondary"
            className="group cursor-pointer gap-1.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
            onClick={() => onEdit(index, bubble)}
            data-testid={`${testIdPrefix}-bubble-${index}`}
          >
            <Icon className="h-3 w-3" />
            <span>{config?.label || bubble.type}: {getBubbleDisplayText(bubble)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`${testIdPrefix}-bubble-${index}-remove`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}

// ===== BUBBLE EDIT DIALOG =====

function BubbleEditDialog({
  bubble,
  onSave,
  onClose,
}: {
  bubble: BubbleValue;
  onSave: (value: BubbleValue) => void;
  onClose: () => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    ('preset' in bubble && bubble.preset) || ''
  );
  const [customValue, setCustomValue] = useState<string>(
    ('customValue' in bubble && bubble.customValue) || ''
  );

  const config = BUBBLE_TYPE_CONFIG[bubble.type];
  const presets = config?.presets;

  // Special presets for human-interaction and props
  const specialPresets = bubble.type === 'human-interaction'
    ? HUMAN_INTERACTION_PRESETS
    : bubble.type === 'props'
    ? PROPS_PRESETS
    : null;

  const handleSave = () => {
    const updated: { type: string; preset?: string; customValue?: string } = { type: bubble.type };
    if (selectedPreset && selectedPreset !== 'Custom') {
      updated.preset = selectedPreset;
    }
    if (selectedPreset === 'Custom' || (!presets && !specialPresets)) {
      updated.customValue = customValue;
    }
    onSave(updated as unknown as BubbleValue);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="edit-bubble-dialog">
        <DialogHeader>
          <DialogTitle>{config?.label || bubble.type}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Preset grid */}
          {presets && (
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSelectedPreset(preset)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    selectedPreset === preset
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                  data-testid={`edit-bubble-preset-${preset}`}
                >
                  {preset}
                </button>
              ))}
              <button
                onClick={() => setSelectedPreset('Custom')}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selectedPreset === 'Custom'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
                data-testid="edit-bubble-preset-custom"
              >
                Custom
              </button>
            </div>
          )}

          {/* Special presets (human-interaction, props) */}
          {specialPresets && (
            <div className="grid grid-cols-2 gap-2">
              {specialPresets.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedPreset(opt.value)}
                  className={`rounded-lg border-2 px-4 py-3 text-left text-sm transition-all ${
                    selectedPreset === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                  data-testid={`edit-bubble-preset-${opt.value}`}
                >
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
              <button
                onClick={() => setSelectedPreset('Custom')}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selectedPreset === 'Custom'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
                data-testid="edit-bubble-preset-custom"
              >
                Custom
              </button>
            </div>
          )}

          {/* Custom value input */}
          {(selectedPreset === 'Custom' || (!presets && !specialPresets)) && (
            <Textarea
              placeholder="Describe your custom setting..."
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="min-h-[80px]"
              data-testid="edit-bubble-custom-input"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!selectedPreset && !customValue}
            data-testid="edit-bubble-save"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
