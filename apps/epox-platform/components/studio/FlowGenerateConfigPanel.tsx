'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageIcon, Package, Tag, SlidersHorizontal, Plus, X, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Specifications options
const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'] as const;
const IMAGE_QUALITY_OPTIONS = [
  { id: '1k', label: '1K', resolution: '1024×1024' },
  { id: '2k', label: '2K', resolution: '2048×2048' },
  { id: '4k', label: '4K', resolution: '4096×4096' },
] as const;

export interface BaseImage {
  id: string;
  url: string;
  isPrimary?: boolean;
  resolution?: { width: number; height: number };
}

export interface ProductInfo {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  materials?: string[];
  style?: string[];
}

export interface FlowGenerateConfigPanelProps {
  // Base Images
  baseImages: BaseImage[];
  selectedBaseImageId: string;
  onSelectBaseImage: (id: string) => void;

  // Product
  product: ProductInfo;

  // Tags - Flow level
  flowTags: string[];
  onAddFlowTag: (tag: string) => void;
  onRemoveFlowTag: (tag: string) => void;

  // Tags - Scene type level (inherited, read-only display)
  sceneTypeTags?: string[];
  sceneTypeName?: string;

  // Tags - Collection level (inherited, read-only display)
  collectionTags?: string[];
  collectionName?: string;

  // Specifications
  aspectRatio: (typeof ASPECT_RATIOS)[number];
  onAspectRatioChange: (ratio: (typeof ASPECT_RATIOS)[number]) => void;
  imageQuality: '1k' | '2k' | '4k';
  onImageQualityChange: (quality: '1k' | '2k' | '4k') => void;

  className?: string;
}

export function FlowGenerateConfigPanel({
  baseImages,
  selectedBaseImageId,
  onSelectBaseImage,
  product,
  flowTags,
  onAddFlowTag,
  onRemoveFlowTag,
  sceneTypeTags = [],
  sceneTypeName,
  collectionTags = [],
  collectionName,
  aspectRatio,
  onAspectRatioChange,
  imageQuality,
  onImageQualityChange,
  className,
}: FlowGenerateConfigPanelProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !flowTags.includes(tagInput.trim())) {
      onAddFlowTag(tagInput.trim());
      setTagInput('');
    }
  };

  // Combine all tags for display (showing inheritance)
  const allEffectiveTags = [...new Set([...collectionTags, ...sceneTypeTags, ...flowTags])];

  return (
    <aside
      className={cn('flex w-80 flex-col overflow-hidden border-l border-border bg-card', className)}
    >
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold">Generation Settings</h3>
        <p className="text-sm text-muted-foreground">Configure your image generation</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <Accordion
          type="multiple"
          defaultValue={['base-image', 'tags', 'specifications']}
          className="px-4"
        >
          {/* Base Image Section */}
          <AccordionItem value="base-image">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Base Image</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                {baseImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => onSelectBaseImage(img.id)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-xl ring-2 transition-all',
                      selectedBaseImageId === img.id
                        ? 'ring-primary ring-offset-2 ring-offset-background'
                        : 'ring-transparent hover:ring-primary/50'
                    )}
                  >
                    <Image src={img.url} alt="Base" fill className="object-cover" unoptimized />
                    {img.isPrimary && (
                      <Badge
                        className="absolute bottom-1 left-1 px-1.5 py-0.5 text-2xs"
                        variant="default"
                      >
                        Primary
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Product Section */}
          <AccordionItem value="product">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Product</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SKU</span>
                  <span>{product.sku}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span>{product.category}</span>
                </div>
                {product.materials && product.materials.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materials</span>
                    <span>{product.materials.join(', ')}</span>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Tags Section */}
          <AccordionItem value="tags">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>Prompt Tags</span>
                <Badge variant="outline" className="ml-1 text-xs">
                  {allEffectiveTags.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {/* Collection Tags (inherited) */}
              {collectionTags.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs uppercase text-muted-foreground">
                      {collectionName || 'Collection'} Tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {collectionTags.map((tag) => (
                      <Badge key={`col-${tag}`} variant="outline" className="bg-muted/30 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Scene Type Tags (inherited) */}
              {sceneTypeTags.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs uppercase text-muted-foreground">
                      {sceneTypeName || 'Scene Type'} Tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sceneTypeTags.map((tag) => (
                      <Badge
                        key={`scene-${tag}`}
                        variant="outline"
                        className="bg-accent/10 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Flow Tags (editable) */}
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Tag className="h-3 w-3 text-primary" />
                  <span className="text-xs uppercase text-muted-foreground">Flow Tags</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {flowTags.map((tag) => (
                    <Badge key={`flow-${tag}`} variant="secondary" className="pr-1 text-sm">
                      {tag}
                      <button
                        className="ml-1 opacity-50 hover:opacity-100"
                        onClick={() => onRemoveFlowTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex gap-1">
                  <Input
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="h-8 text-sm"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Specifications Section */}
          <AccordionItem value="specifications">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                <span>Image</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {/* Aspect Ratio */}
              <div>
                <label className="mb-1.5 block text-xs uppercase text-muted-foreground">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => onAspectRatioChange(ratio)}
                      className={cn(
                        'rounded-md px-2 py-1.5 text-xs font-medium transition-all',
                        aspectRatio === ratio
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Quality */}
              <div>
                <label className="mb-1.5 block text-xs uppercase text-muted-foreground">
                  Quality
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {IMAGE_QUALITY_OPTIONS.map((quality) => (
                    <button
                      key={quality.id}
                      onClick={() => onImageQualityChange(quality.id as '1k' | '2k' | '4k')}
                      className={cn(
                        'flex flex-col items-center rounded-lg px-2 py-2 transition-all',
                        imageQuality === quality.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <span className="text-sm font-semibold">{quality.label}</span>
                      <span className="text-2xs opacity-70">{quality.resolution}</span>
                    </button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
}
