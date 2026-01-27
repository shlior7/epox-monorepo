'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Clock,
  Check,
  X,
  Loader2,
  Pin,
  Settings2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Maximize2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ImageEditOverlay } from '@/components/ui/image-edit-overlay';
import { ImageEditorModal } from '@/components/studio/modals/ImageEditorModal';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import type { AssetStatus, ApprovalStatus } from '@/lib/types';
import type { ImageAspectRatio } from 'visualizer-types';

interface Revision {
  id: string;
  imageUrl: string;
  timestamp: Date;
  prompt?: string;
  type: 'original' | 'generated' | 'edited';
  isVideo?: boolean;
  aspectRatio?: ImageAspectRatio;
}

interface BaseImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface GenerationFlowCardProps {
  flowId: string;
  collectionId: string;
  product: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
  };
  baseImages: BaseImage[];
  selectedBaseImageId: string;
  revisions: Revision[];
  status: AssetStatus;
  approvalStatus: ApprovalStatus;
  isPinned: boolean;
  sceneType?: string;
  availableSceneTypes?: string[];
  onChangeBaseImage?: (baseImageId: string) => void;
  onChangeSceneType?: (sceneType: string) => void;
  onPin?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDeleteRevision?: (revisionId: string) => void;
  onImageEdited?: (revisionId: string, result: { mode: 'overwrite' | 'copy'; imageDataUrl: string; imageUrl?: string; assetId?: string }) => void;
  onGenerate?: () => void;
  onClick?: () => void;
  // Bulk selection
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
  testId?: string;
}

const statusConfig: Record<
  AssetStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: { label: 'Queued', icon: Clock, className: 'text-muted-foreground' },
  generating: { label: 'Generating', icon: Loader2, className: 'text-warning animate-spin' },
  completed: { label: 'Completed', icon: Check, className: 'text-success' },
  error: { label: 'Error', icon: X, className: 'text-destructive' },
};

const approvalConfig: Record<
  ApprovalStatus,
  { label: string; variant: 'default' | 'success' | 'destructive' | 'muted' }
> = {
  pending: { label: 'Pending', variant: 'muted' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

// Default scene types if none provided
const DEFAULT_SCENE_TYPES = [
  'Living Room',
  'Bedroom',
  'Office',
  'Kitchen',
  'Dining Room',
  'Outdoor',
  'Studio',
];

export function GenerationFlowCard({
  flowId,
  collectionId,
  product,
  baseImages,
  selectedBaseImageId,
  revisions,
  status,
  approvalStatus,
  isPinned,
  sceneType,
  availableSceneTypes = DEFAULT_SCENE_TYPES,
  onChangeBaseImage,
  onChangeSceneType,
  onPin,
  onApprove,
  onReject,
  onDeleteRevision,
  onImageEdited,
  onGenerate,
  onClick,
  isSelected = false,
  onSelect,
  className,
  testId,
}: GenerationFlowCardProps) {
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(0);
  const [showBaseImageModal, setShowBaseImageModal] = useState(false);
  const [showSceneTypeModal, setShowSceneTypeModal] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRevisionId, setEditingRevisionId] = useState<string | null>(null);
  const [showCustomSceneInput, setShowCustomSceneInput] = useState(false);
  const [customSceneType, setCustomSceneType] = useState('');

  const handleOpenEditor = useCallback((revisionId: string) => {
    setEditingRevisionId(revisionId);
    setEditorOpen(true);
  }, []);

  const handleImageSave = useCallback((result: { mode: 'overwrite' | 'copy'; imageDataUrl: string; imageUrl?: string; assetId?: string }) => {
    if (editingRevisionId && onImageEdited) {
      onImageEdited(editingRevisionId, result);
    }
  }, [editingRevisionId, onImageEdited]);

  const editingRevision = editingRevisionId ? revisions.find(r => r.id === editingRevisionId) : null;

  const StatusIcon = statusConfig[status].icon;
  const isCompleted = status === 'completed';
  const selectedBaseImage =
    baseImages.find((img) => img.id === selectedBaseImageId) || baseImages[0];
  const currentRevision = revisions[currentRevisionIndex];

  const canNavigatePrev = currentRevisionIndex > 0;
  const canNavigateNext = currentRevisionIndex < revisions.length - 1;

  const isGenerating = status === 'generating';
  const hasRevisions = revisions.length > 0;

  const cardContent = (
    <Card
      className={cn(
        'group flex flex-col overflow-hidden transition-all',
        isGenerating && 'ring-2 ring-warning/50',
        isSelected && 'ring-2 ring-primary',
        !isGenerating && !isSelected && 'hover:ring-2 hover:ring-primary/50',
        className
      )}
      testId={testId}
      data-flow-id={flowId}
    >
      {/* Product Info Header */}
      <div className="border-b border-border bg-card/50 p-3" data-testid={buildTestId(testId, 'header')}>
        <div className="flex items-center gap-3">
          {/* Base Image Thumbnail - Clickable with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (baseImages.length > 0) {
                      setShowBaseImageModal(true);
                    }
                  }}
                  className="group/thumb relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary ring-2 ring-border transition-all hover:ring-primary"
                  data-testid={buildTestId(testId, 'base-image')}
                  disabled={baseImages.length === 0}
                >
                  {selectedBaseImage?.url ? (
                    <>
                      <Image
                        src={selectedBaseImage.url}
                        alt="Base"
                        width={40}
                        height={40}
                        className="h-full w-full rounded object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded bg-black/60 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                        <RefreshCw className="h-4 w-4 text-white/90" />
                      </div>
                    </>
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to change base image</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Product Name */}
          <div className="min-w-0 flex-1" onClick={onClick}>
            <p className="truncate text-sm font-medium" data-testid={buildTestId(testId, 'name')}>
              {product.name}
            </p>
            {sceneType && (
              <p className="truncate text-xs text-muted-foreground">{sceneType}</p>
            )}
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2" data-testid={buildTestId(testId, 'header-actions')}>
            {/* Status Badge - Only show when generating */}
            {isGenerating && (
              <Badge variant="outline" className="gap-1 text-[10px]" testId={buildTestId(testId, 'status')}>
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating
              </Badge>
            )}
            {/* Pin indicator */}
            {isPinned && !isGenerating && <Pin className="h-4 w-4 text-primary" />}
            {/* Bulk selection checkbox */}
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4"
                data-testid={buildTestId(testId, 'checkbox')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Preview / Status */}
      <div className="cursor-pointer" onClick={onClick}>
        {isGenerating && !hasRevisions ? (
          // Status placeholder when generating with no revisions yet
          <div className="flex aspect-video flex-col items-center justify-center bg-warning/10">
            <StatusIcon className={cn('mb-2 h-8 w-8', statusConfig[status].className)} />
            <span className="text-sm font-medium text-warning">{statusConfig[status].label}</span>
            <div className="mt-2 flex items-center gap-1">
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        ) : currentRevision ? (
          // Current revision preview (show even when generating if we have revisions)
          <div className="relative aspect-video bg-black/20" data-testid={buildTestId(testId, 'preview')}>
            {!currentRevision.isVideo && !isGenerating ? (
              <ImageEditOverlay
                onEdit={() => handleOpenEditor(currentRevision.id)}
                className="h-full w-full"
                position="bottom-right"
                testId={buildTestId(testId, 'preview', 'edit-overlay')}
              >
                <Image
                  src={currentRevision.imageUrl}
                  alt="Generated"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </ImageEditOverlay>
            ) : (
              <Image
                src={currentRevision.imageUrl}
                alt="Generated"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
            )}
            {/* Generating overlay - show on top of image when generating */}
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex flex-col items-center">
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-warning" />
                  <span className="text-sm font-medium text-white">Generating...</span>
                </div>
              </div>
            )}
            {/* Navigation overlay */}
            {revisions.length > 1 && !isGenerating && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (canNavigatePrev) setCurrentRevisionIndex((i) => i - 1);
                  }}
                  className={cn(
                    'absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-opacity',
                    canNavigatePrev ? 'opacity-0 hover:bg-black/70 group-hover:opacity-100' : 'hidden'
                  )}
                  data-testid={buildTestId(testId, 'nav', 'prev')}
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (canNavigateNext) setCurrentRevisionIndex((i) => i + 1);
                  }}
                  className={cn(
                    'absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-opacity',
                    canNavigateNext ? 'opacity-0 hover:bg-black/70 group-hover:opacity-100' : 'hidden'
                  )}
                  data-testid={buildTestId(testId, 'nav', 'next')}
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              </>
            )}
            {/* Fullscreen button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFullscreenImage(currentRevision.imageUrl);
              }}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
              data-testid={buildTestId(testId, 'fullscreen')}
            >
              <Maximize2 className="h-4 w-4 text-white" />
            </button>
            {/* Revision counter */}
            {revisions.length > 1 && (
              <div
                className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
                data-testid={buildTestId(testId, 'counter')}
              >
                {currentRevisionIndex + 1}/{revisions.length}
              </div>
            )}
          </div>
        ) : status === 'pending' ? (
          <div className="flex aspect-video flex-col items-center justify-center bg-secondary">
            <Clock className="mb-2 h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Queued</span>
          </div>
        ) : status === 'error' ? (
          <div className="flex aspect-video flex-col items-center justify-center bg-destructive/10">
            <X className="mb-2 h-8 w-8 text-destructive" />
            <span className="text-sm text-destructive">Error</span>
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-secondary">
            <span className="text-sm text-muted-foreground">No revisions</span>
          </div>
        )}
      </div>

      {/* Horizontal Revision Gallery - show whenever there are revisions */}
      {hasRevisions && (
        <div className="border-t border-border bg-card/30 p-2" data-testid={buildTestId(testId, 'revisions')}>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {revisions.map((rev, idx) => (
              <div
                key={rev.id}
                className="group/revision relative flex-shrink-0"
                data-testid={buildTestId(testId, 'revision', rev.id)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentRevisionIndex(idx);
                  }}
                  className={cn(
                    'h-12 w-12 overflow-hidden rounded ring-2 transition-all',
                    idx === currentRevisionIndex
                      ? 'ring-primary'
                      : 'ring-transparent hover:ring-primary/50'
                  )}
                  data-testid={buildTestId(testId, 'revision', rev.id, 'select')}
                >
                  <Image
                    src={rev.imageUrl}
                    alt={`Rev ${idx + 1}`}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </button>
                {/* Delete button - appears on hover */}
                {onDeleteRevision && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteRevision(rev.id);
                      // Adjust current index if needed
                      if (idx <= currentRevisionIndex && currentRevisionIndex > 0) {
                        setCurrentRevisionIndex((i) => i - 1);
                      }
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover/revision:opacity-100"
                    data-testid={buildTestId(testId, 'revision', rev.id, 'delete')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div
        className="flex items-center justify-between border-t border-border px-2 py-1.5"
        data-testid={buildTestId(testId, 'footer')}
      >
        {/* Left: Pin + Scene Type */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin?.();
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                    isPinned
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  data-testid={buildTestId(testId, 'action-pin')}
                >
                  <Pin className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPinned ? 'Unpin' : 'Pin'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Scene Type Tag Dropdown */}
          <DropdownMenu open={showCustomSceneInput ? true : undefined}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  sceneType
                    ? 'bg-muted text-muted-foreground hover:bg-accent'
                    : 'border border-dashed border-border text-muted-foreground hover:border-foreground/30'
                )}
                data-testid={buildTestId(testId, 'scene-type-dropdown')}
              >
                <span className="max-w-[100px] truncate">{sceneType || 'Scene type'}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
              {showCustomSceneInput ? (
                <div className="p-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Enter scene type..."
                    value={customSceneType}
                    onChange={(e) => setCustomSceneType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customSceneType.trim()) {
                        onChangeSceneType?.(customSceneType.trim());
                        setShowCustomSceneInput(false);
                        setCustomSceneType('');
                      } else if (e.key === 'Escape') {
                        setShowCustomSceneInput(false);
                        setCustomSceneType('');
                      }
                    }}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                    autoFocus
                  />
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => {
                        if (customSceneType.trim()) {
                          onChangeSceneType?.(customSceneType.trim());
                          setShowCustomSceneInput(false);
                          setCustomSceneType('');
                        }
                      }}
                      className="flex-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomSceneInput(false);
                        setCustomSceneType('');
                      }}
                      className="flex-1 rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {availableSceneTypes.map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeSceneType?.(type);
                      }}
                      className={cn(
                        type === sceneType ? 'bg-primary/10 font-medium text-primary' : ''
                      )}
                      data-testid={buildTestId(testId, 'scene-type', type)}
                    >
                      {type}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomSceneInput(true);
                    }}
                    className="border-t border-border font-medium text-primary"
                    data-testid={buildTestId(testId, 'scene-type', 'custom')}
                  >
                    + Custom...
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Generate Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate?.();
                }}
                disabled={isGenerating}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                  isGenerating
                    ? 'cursor-not-allowed text-muted-foreground'
                    : 'text-primary hover:bg-primary/10'
                )}
                data-testid={buildTestId(testId, 'action-generate')}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isGenerating ? 'Generating...' : 'Generate images'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  );

  // Base Image Modal
  const baseImageModal = (
    <Dialog open={showBaseImageModal} onOpenChange={setShowBaseImageModal}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Select Base Image</DialogTitle>
          <DialogDescription>Choose a base image for this generation flow</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-4">
          {baseImages.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeBaseImage?.(img.id);
                setShowBaseImageModal(false);
              }}
              className={cn(
                'relative aspect-square overflow-hidden rounded-lg ring-2 transition-all hover:scale-105',
                img.id === selectedBaseImageId
                  ? 'ring-primary ring-offset-2'
                  : 'ring-border hover:ring-primary/50'
              )}
              data-testid={buildTestId(testId, 'base-image-option', img.id)}
            >
              <Image
                src={img.url}
                alt="Base option"
                fill
                className="object-cover"
                sizes="120px"
                unoptimized
              />
              {img.id === selectedBaseImageId && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                  <Check className="h-6 w-6 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Scene Type Modal
  const sceneTypeModal = (
    <Dialog open={showSceneTypeModal} onOpenChange={setShowSceneTypeModal}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Change Scene Type</DialogTitle>
          <DialogDescription>Select a scene type for this product</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4">
          {availableSceneTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeSceneType?.(type);
                setShowSceneTypeModal(false);
              }}
              className={cn(
                'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all hover:bg-accent',
                type === sceneType
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              )}
              data-testid={buildTestId(testId, 'scene-type-option', type)}
            >
              {type}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Fullscreen image dialog
  const fullscreenDialog = (
    <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && setFullscreenImage(null)}>
      <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-hidden border-none bg-black/95 p-0">
        {fullscreenImage && (
          <div className="relative flex h-full w-full items-center justify-center">
            <Image
              src={fullscreenImage}
              alt="Fullscreen preview"
              width={1920}
              height={1080}
              className="max-h-[85vh] max-w-full object-contain"
              unoptimized
            />
            {/* Navigation in fullscreen */}
            {revisions.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (canNavigatePrev) {
                      const newIndex = currentRevisionIndex - 1;
                      setCurrentRevisionIndex(newIndex);
                      setFullscreenImage(revisions[newIndex].imageUrl);
                    }
                  }}
                  className={cn(
                    'absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-all hover:bg-black/70',
                    !canNavigatePrev && 'cursor-not-allowed opacity-30'
                  )}
                  disabled={!canNavigatePrev}
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (canNavigateNext) {
                      const newIndex = currentRevisionIndex + 1;
                      setCurrentRevisionIndex(newIndex);
                      setFullscreenImage(revisions[newIndex].imageUrl);
                    }
                  }}
                  className={cn(
                    'absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-all hover:bg-black/70',
                    !canNavigateNext && 'cursor-not-allowed opacity-30'
                  )}
                  disabled={!canNavigateNext}
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}
            {/* Counter */}
            {revisions.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {currentRevisionIndex + 1} / {revisions.length}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Image Editor Modal
  const imageEditorModal = editingRevision && !editingRevision.isVideo && (
    <ImageEditorModal
      open={editorOpen}
      onOpenChange={setEditorOpen}
      imageUrl={editingRevision.imageUrl}
      imageType="generated"
      imageId={editingRevision.id}
      productId={product.id}
      onSave={handleImageSave}
    />
  );

  // Always render without Link since we handle navigation via onClick
  return (
    <>
      {cardContent}
      {baseImageModal}
      {sceneTypeModal}
      {fullscreenDialog}
      {imageEditorModal}
    </>
  );
}
