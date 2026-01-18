'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X, Plus, Loader2, Wand2, Package, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SCENE_TYPES, STYLE_OPTIONS, MOOD_OPTIONS, LIGHTING_OPTIONS } from '@/lib/constants';
import type { PromptTags } from '@/lib/types';
import { apiClient } from '@/lib/api-client';

interface StyleConfigStepProps {
  promptTags: PromptTags;
  onTagsChange: (tags: PromptTags) => void;
  selectedProductCount?: number;
  inspirationCount?: number;
}

const tagCategories = [
  {
    key: 'sceneType' as const,
    label: 'Room Type',
    options: SCENE_TYPES,
    description: 'Where will this product be displayed?',
  },
  {
    key: 'style' as const,
    label: 'Design Style',
    options: STYLE_OPTIONS,
    description: 'What aesthetic are you going for?',
  },
  {
    key: 'mood' as const,
    label: 'Mood & Feel',
    options: MOOD_OPTIONS,
    description: 'What atmosphere should it evoke?',
  },
  {
    key: 'lighting' as const,
    label: 'Lighting',
    options: LIGHTING_OPTIONS,
    description: 'How should the scene be lit?',
  },
];

export function StyleConfigStep({
  promptTags,
  onTagsChange,
  selectedProductCount = 0,
  inspirationCount = 0,
}: StyleConfigStepProps) {
  const [customInput, setCustomInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  // Call AI analysis API on mount
  useEffect(() => {
    const analyzeProducts = async () => {
      try {
        const data = await apiClient.analyzeProducts({
          productIds: ['mock-product-1'], // Would come from props in production
          // productImageUrls and inspirationImageUrls would be passed here
        });

        // Apply AI suggestions if user hasn't selected anything yet
        if (promptTags.sceneType.length === 0 && promptTags.style.length === 0) {
          onTagsChange({
            sceneType: data.suggestedTags.sceneType || ['Living Room'],
            style: data.suggestedTags.style || ['Modern'],
            mood: data.suggestedTags.mood || ['Cozy'],
            lighting: data.suggestedTags.lighting || ['Natural'],
            custom: [],
          });
        }
      } catch (error) {
        console.warn('Analysis API failed, using defaults:', error);
        // Apply defaults on error
        if (promptTags.sceneType.length === 0 && promptTags.style.length === 0) {
          onTagsChange({
            sceneType: ['Living Room'],
            style: ['Modern'],
            mood: ['Cozy'],
            lighting: ['Natural'],
            custom: [],
          });
        }
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTag = (category: keyof PromptTags, tag: string) => {
    const current = promptTags[category];
    const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onTagsChange({ ...promptTags, [category]: updated });
  };

  const addCustomTag = () => {
    if (customInput.trim()) {
      onTagsChange({
        ...promptTags,
        custom: [...promptTags.custom, customInput.trim()],
      });
      setCustomInput('');
    }
  };

  const removeCustomTag = (tag: string) => {
    onTagsChange({
      ...promptTags,
      custom: promptTags.custom.filter((t) => t !== tag),
    });
  };

  const totalTags = Object.values(promptTags).flat().length;

  if (isAnalyzing) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="py-20 text-center">
          <div className="mb-6 inline-flex h-20 w-20 animate-pulse-glow items-center justify-center rounded-full bg-primary/20">
            <Wand2 className="h-10 w-10 animate-pulse text-primary" />
          </div>
          <h2 className="text-gradient-gold mb-3 text-2xl font-bold">Analyzing Your Selection</h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            AI is analyzing your {selectedProductCount} products
            {inspirationCount > 0 && ` and ${inspirationCount} inspiration images`} to suggest the
            best style settings...
          </p>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>This usually takes a few seconds</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <h2 className="text-gradient-gold mb-2 text-2xl font-bold">Style Your Generation</h2>
        <p className="text-muted-foreground">
          Based on your {selectedProductCount} products
          {inspirationCount > 0 && ` and ${inspirationCount} inspiration images`}, we suggest these
          tags. Click to toggle or add your own.
        </p>
      </div>

      {/* Analysis Summary */}
      <Card className="mb-8 animate-fade-in border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <span className="text-muted-foreground">{selectedProductCount} products</span>
          </div>
          {inspirationCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
                <ImageIcon className="h-4 w-4 text-accent" />
              </div>
              <span className="text-muted-foreground">{inspirationCount} inspiration images</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI-suggested tags applied</span>
          </div>
        </div>
      </Card>

      {/* Preview Card */}
      {totalTags > 0 && (
        <Card className="mb-8 animate-fade-in border-border/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium">Prompt Preview</p>
              <p className="text-sm text-muted-foreground">
                &quot;A product visualization in a{' '}
                <span className="font-medium text-foreground">
                  {promptTags.sceneType.join(', ') || 'modern space'}
                </span>{' '}
                with{' '}
                <span className="font-medium text-foreground">
                  {promptTags.style.join(', ') || 'clean'} style
                </span>
                ,{' '}
                <span className="font-medium text-foreground">
                  {promptTags.mood.join(', ') || 'inviting'} atmosphere
                </span>{' '}
                and{' '}
                <span className="font-medium text-foreground">
                  {promptTags.lighting.join(', ') || 'natural'} lighting
                </span>
                {promptTags.custom.length > 0 && <>, featuring {promptTags.custom.join(', ')}</>}
                .&quot;
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tag Categories */}
      <div className="space-y-8">
        {tagCategories.map((category, categoryIndex) => (
          <div
            key={category.key}
            className={cn('animate-fade-in-up opacity-0', `stagger-${categoryIndex + 1}`)}
          >
            <div className="mb-3">
              <h3 className="text-lg font-semibold">{category.label}</h3>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {category.options.map((option) => {
                const isSelected = promptTags[category.key].includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => toggleTag(category.key, option)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                      'border hover:scale-105 active:scale-95',
                      isSelected
                        ? 'glow-primary-sm border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-secondary/50'
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Custom Tags */}
        <div className="stagger-5 animate-fade-in-up opacity-0">
          <div className="mb-3">
            <h3 className="text-lg font-semibold">Custom Keywords</h3>
            <p className="text-sm text-muted-foreground">Add any specific details you want</p>
          </div>
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="e.g., 'marble countertop', 'plants'"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
              className="flex-1"
            />
            <Button onClick={addCustomTag} disabled={!customInput.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          {promptTags.custom.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {promptTags.custom.map((tag) => (
                <Badge key={tag} variant="secondary" className="py-1.5 pl-3 pr-2 text-sm">
                  {tag}
                  <button
                    onClick={() => removeCustomTag(tag)}
                    className="ml-2 transition-colors hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
