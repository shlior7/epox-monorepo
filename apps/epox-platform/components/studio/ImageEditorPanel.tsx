'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Loader2,
  Sparkles,
  Upload,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Wand2,
  ImageOff,
  Maximize2,
  Sun,
  Palette,
  Contrast,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

interface ImageComponent {
  id: string;
  name: string;
  description: string;
  editPrompt?: string;
}

interface Revision {
  id: string;
  imageDataUrl: string;
  timestamp: number;
  prompt?: string;
  type: 'original' | 'edit' | 'remove-bg' | 'upscale';
}

interface AdjustmentHint {
  id: string;
  label: string;
  description: string;
  prompt: string;
  icon: 'sun' | 'palette' | 'contrast' | 'sparkles';
  category: string;
}

interface ImageEditorPanelProps {
  imageUrl: string;
  productName: string;
  onSave: (imageDataUrl: string) => void;
  onClose: () => void;
}

export function ImageEditorPanel({
  imageUrl,
  productName,
  onSave,
  onClose,
}: ImageEditorPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [components, setComponents] = useState<ImageComponent[]>([]);
  const [adjustmentHints, setAdjustmentHints] = useState<AdjustmentHint[]>([]);
  const [overallDescription, setOverallDescription] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Revision history
  const [revisions, setRevisions] = useState<Revision[]>([
    {
      id: 'original',
      imageDataUrl: imageUrl,
      timestamp: Date.now(),
      prompt: 'Original image',
      type: 'original',
    },
  ]);
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(0);

  const currentRevision = revisions[currentRevisionIndex];
  const currentImageUrl = currentRevision?.imageDataUrl || imageUrl;
  const isOriginal = currentRevisionIndex === 0;
  const canUndo = currentRevisionIndex > 0;
  const canRedo = currentRevisionIndex < revisions.length - 1;

  // Analyze image components
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const data = await apiClient.analyzeImage(currentImageUrl);

      if (data.success) {
        setComponents(data.components || []);
        setOverallDescription(data.overallDescription || '');
        setAdjustmentHints(data.suggestedAdjustments || []);
        toast.success('Image analyzed successfully');
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply edit
  const handleEdit = async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsEditing(true);
    setError(null);

    try {
      const data = await apiClient.editImage(currentImageUrl, prompt);

      if (data.success && data.editedImageDataUrl) {
        // Add new revision
        const newRevision: Revision = {
          id: `edit_${Date.now()}`,
          imageDataUrl: data.editedImageDataUrl,
          timestamp: Date.now(),
          prompt,
          type: 'edit',
        };

        // Remove any revisions after current index and add new one
        setRevisions((prev) => [...prev.slice(0, currentRevisionIndex + 1), newRevision]);
        setCurrentRevisionIndex((prev) => prev + 1);
        setEditPrompt('');
        toast.success('Edit applied successfully');
      } else {
        throw new Error(data.error || 'Edit failed');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to apply edit');
    } finally {
      setIsEditing(false);
    }
  };

  // Remove background
  const handleRemoveBackground = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const data = await apiClient.removeBackground(currentImageUrl, true);

      if (data.success && data.imageDataUrl) {
        const newRevision: Revision = {
          id: `rmbg_${Date.now()}`,
          imageDataUrl: data.imageDataUrl,
          timestamp: Date.now(),
          prompt: 'Remove background',
          type: 'remove-bg',
        };

        setRevisions((prev) => [...prev.slice(0, currentRevisionIndex + 1), newRevision]);
        setCurrentRevisionIndex((prev) => prev + 1);
        toast.success('Background removed successfully');
      } else {
        throw new Error(data.error || 'Background removal failed');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to remove background');
    } finally {
      setIsProcessing(false);
    }
  };

  // Upscale image
  const handleUpscale = async (resolution: '2k' | '4k') => {
    setIsProcessing(true);
    setError(null);

    try {
      const data = await apiClient.upscaleImage(currentImageUrl, resolution);

      if (data.success && data.imageDataUrl) {
        const newRevision: Revision = {
          id: `upscale_${Date.now()}`,
          imageDataUrl: data.imageDataUrl,
          timestamp: Date.now(),
          prompt: `Upscale to ${resolution}`,
          type: 'upscale',
        };

        setRevisions((prev) => [...prev.slice(0, currentRevisionIndex + 1), newRevision]);
        setCurrentRevisionIndex((prev) => prev + 1);
        toast.success(`Image upscaled to ${resolution}`);
      } else {
        throw new Error(data.error || 'Upscale failed');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to upscale image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply adjustment hint
  const handleApplyHint = async (hint: AdjustmentHint) => {
    await handleEdit(hint.prompt);
  };

  const handleUndo = () => {
    if (canUndo) setCurrentRevisionIndex((prev) => prev - 1);
  };

  const handleRedo = () => {
    if (canRedo) setCurrentRevisionIndex((prev) => prev + 1);
  };

  const handleSave = () => {
    onSave(currentImageUrl);
    toast.success('Image saved');
  };

  const getHintIcon = (icon: string) => {
    switch (icon) {
      case 'sun':
        return <Sun className="h-4 w-4" />;
      case 'palette':
        return <Palette className="h-4 w-4" />;
      case 'contrast':
        return <Contrast className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Image Preview */}
      <div className="flex flex-1 flex-col bg-black/20 p-6">
        {/* Image */}
        <div className="relative flex flex-1 items-center justify-center">
          <div className="relative aspect-square max-h-full max-w-full">
            <Image
              src={currentImageUrl}
              alt={productName}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="rounded-lg object-contain"
            />
            {(isEditing || isProcessing) && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>

        {/* Revision History */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndo}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentRevisionIndex + 1} / {revisions.length}
            </span>
            <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedo}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={currentRevision.type === 'original' ? 'muted' : 'secondary'}>
              {currentRevision.type === 'original'
                ? 'Original'
                : currentRevision.type === 'remove-bg'
                  ? 'BG Removed'
                  : currentRevision.type === 'upscale'
                    ? 'Upscaled'
                    : 'Edited'}
            </Badge>
            {currentRevision.prompt && currentRevision.type !== 'original' && (
              <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                {currentRevision.prompt}
              </span>
            )}
          </div>
        </div>

        {/* Revision Thumbnails */}
        {revisions.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {revisions.map((rev, idx) => (
              <button
                key={rev.id}
                onClick={() => setCurrentRevisionIndex(idx)}
                className={cn(
                  'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                  idx === currentRevisionIndex
                    ? 'border-primary'
                    : 'border-transparent hover:border-primary/50'
                )}
              >
                <Image
                  src={rev.imageDataUrl}
                  alt={`Revision ${idx + 1}`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Edit Panel */}
      <div className="flex w-96 flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold">Edit Image</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="edit" className="flex flex-1 flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="edit" className="flex-1">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex-1">
              <Wand2 className="mr-2 h-4 w-4" />
              Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Analyze Button */}
            {components.length === 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Image
                  </>
                )}
              </Button>
            )}

            {/* Components */}
            {components.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Detected Components</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {components.slice(0, 8).map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() =>
                        setSelectedComponentId(selectedComponentId === comp.id ? null : comp.id)
                      }
                      className={cn(
                        'w-full rounded-lg p-2 text-left transition-colors',
                        selectedComponentId === comp.id
                          ? 'border border-primary/30 bg-primary/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <p className="text-sm font-medium capitalize">{comp.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{comp.description}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Adjustment Hints */}
            {adjustmentHints.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Quick Fixes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {adjustmentHints.map((hint) => (
                    <Button
                      key={hint.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleApplyHint(hint)}
                      disabled={isEditing}
                    >
                      {getHintIcon(hint.icon)}
                      <span className="ml-2">{hint.label}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Edit Prompt */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Custom Edit</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  placeholder="Describe what you want to change..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button
                  className="mt-3 w-full"
                  onClick={() => handleEdit(editPrompt)}
                  disabled={!editPrompt.trim() || isEditing}
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Apply Edit
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tools" className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Remove Background */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ImageOff className="h-4 w-4" />
                  Remove Background
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  Remove the background and replace with white.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRemoveBackground}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Remove Background'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Upscale */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Maximize2 className="h-4 w-4" />
                  Upscale Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  Enhance resolution and sharpness.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleUpscale('2k')}
                    disabled={isProcessing}
                  >
                    2K
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleUpscale('4k')}
                    disabled={isProcessing}
                  >
                    4K
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Regenerate */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  Generate a new variation with the same settings.
                </p>
                <Button variant="outline" className="w-full">
                  Regenerate Image
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 border-t border-border p-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="glow" className="flex-1" onClick={handleSave} disabled={isOriginal}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
