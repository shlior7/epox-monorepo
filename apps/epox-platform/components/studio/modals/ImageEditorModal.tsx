'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Loader2,
  Sparkles,
  Pencil,
  Sliders,
  Check,
  Trash2,
  RefreshCw,
  Plus,
  Maximize2,
  Save,
  CloudOff,
  Crop,
  AlertTriangle,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PostAdjustmentsPanel,
  generateFilterString,
  hasAdjustments,
} from '@/components/studio/PostAdjustmentsPanel';
import type { PostAdjustments } from '@/lib/types';
import { DEFAULT_POST_ADJUSTMENTS } from '@/lib/types';

// ===== TYPES =====

interface Revision {
  id: string;
  imageDataUrl: string;
  timestamp: number;
  prompt?: string;
  /** Parent revision index (for tree structure) */
  parentIndex?: number;
  /** R2 storage URL for subsequent edits (avoids re-uploading) */
  storageUrl?: string;
}

// Crop area type
interface CropArea {
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
}

// Aspect ratio presets for cropping
const ASPECT_RATIOS = [
  { value: 'free', label: 'Free', ratio: null },
  { value: '1:1', label: '1:1 (Square)', ratio: 1 },
  { value: '4:3', label: '4:3', ratio: 4 / 3 },
  { value: '3:4', label: '3:4', ratio: 3 / 4 },
  { value: '16:9', label: '16:9 (Widescreen)', ratio: 16 / 9 },
  { value: '9:16', label: '9:16 (Portrait)', ratio: 9 / 16 },
  { value: '3:2', label: '3:2', ratio: 3 / 2 },
  { value: '2:3', label: '2:3', ratio: 2 / 3 },
  { value: 'custom', label: 'Custom', ratio: null },
] as const;

export interface ImageEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageType: 'generated' | 'base';
  imageId?: string;
  productId?: string;
  /** Generation flow ID (if editing within a flow context) */
  flowId?: string;
  /** Called when user saves - for refreshing parent component */
  onSave: (result: {
    mode: 'overwrite' | 'copy';
    imageDataUrl: string;
    imageUrl?: string;
    assetId?: string;
  }) => void;
  initialAdjustments?: PostAdjustments;
  /** Whether this image is currently synced with the store (base images from store or synced generated assets) */
  isSyncedWithStore?: boolean;
}

// ===== COMPONENT =====

export function ImageEditorModal({
  open,
  onOpenChange,
  imageUrl,
  imageType,
  imageId,
  productId,
  flowId,
  onSave,
  initialAdjustments,
  isSyncedWithStore = false,
}: ImageEditorModalProps) {
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState<string | null>(null);
  const [isProcessingAdjustments, setIsProcessingAdjustments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'edit' | 'adjustments'>('edit');

  // Adjustments state
  const [adjustments, setAdjustments] = useState<PostAdjustments>(
    initialAdjustments ? { ...initialAdjustments } : { ...DEFAULT_POST_ADJUSTMENTS }
  );

  // Revision history - vertical list, new revisions inserted below selected
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(0);

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Fullscreen preview
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Edit session ID for R2 temp storage (generated once per session)
  const [editSessionId] = useState(
    () => `edit_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`
  );

  // Interactive Crop state
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('free');
  const [cropArea, setCropArea] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState<string | null>(null); // 'move' | 'nw' | 'ne' | 'sw' | 'se' | null
  const [dragStart, setDragStart] = useState<{ x: number; y: number; crop: CropArea } | null>(null);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Derived values
  const currentRevision = revisions[currentRevisionIndex];
  const isRevisionGenerating = currentRevision && !currentRevision.imageDataUrl;
  const currentImageUrl = currentRevision?.imageDataUrl || imageUrl;
  const isOriginal = currentRevisionIndex === 0;
  const hasEdits = revisions.length > 1;

  // Load original image as first revision
  useEffect(() => {
    if (open && imageUrl && revisions.length === 0) {
      const loadOriginalImage = async () => {
        // If it's already a data URL with image MIME type, use it directly
        if (imageUrl.startsWith('data:image/')) {
          setRevisions([
            {
              id: 'original',
              imageDataUrl: imageUrl,
              timestamp: Date.now(),
              prompt: 'Original image',
            },
          ]);
          setCurrentRevisionIndex(0);
          return;
        }

        try {
          // Use the download-image API proxy to avoid CORS issues
          const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
          const response = await fetch(proxyUrl);

          if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
          }

          // Get content type from response header
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const buffer = await response.arrayBuffer();
          const bytes = new Uint8Array(buffer);

          // Detect actual image type from magic bytes
          let mimeType = contentType;
          if (bytes[0] === 0xff && bytes[1] === 0xd8) {
            mimeType = 'image/jpeg';
          } else if (
            bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4e &&
            bytes[3] === 0x47
          ) {
            mimeType = 'image/png';
          } else if (
            bytes[0] === 0x52 &&
            bytes[1] === 0x49 &&
            bytes[2] === 0x46 &&
            bytes[3] === 0x46
          ) {
            mimeType = 'image/webp';
          } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
            mimeType = 'image/gif';
          }

          // Manually construct data URL with correct MIME type
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          const dataUrl = `data:${mimeType};base64,${base64}`;

          console.log('Image loaded as data URL, MIME:', mimeType, 'length:', dataUrl.length);
          setRevisions([
            {
              id: 'original',
              imageDataUrl: dataUrl,
              timestamp: Date.now(),
              prompt: 'Original image',
              // Store the original R2 URL so the first edit can skip upload
              storageUrl: imageUrl,
            },
          ]);
          setCurrentRevisionIndex(0);
        } catch (err) {
          console.error('Failed to load original image:', err);
          setError('Failed to load image for editing. Please check your connection and try again.');
        }
      };
      loadOriginalImage();
    }
  }, [open, imageUrl, revisions.length]);

  // Track if edits were made (to know if we need cleanup)
  const hasUsedTempStorage = revisions.length > 1;

  // Cleanup temp files when modal closes
  useEffect(() => {
    if (!open && hasUsedTempStorage) {
      // Fire-and-forget cleanup of temp R2 files
      fetch('/api/edit-image/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editSessionId }),
      }).catch((err) => {
        console.warn('Failed to cleanup edit session temp files:', err);
      });
    }
  }, [open, hasUsedTempStorage, editSessionId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setRevisions([]);
      setCurrentRevisionIndex(0);
      setEditPrompt('');
      setError(null);
      setActiveTab('edit');
      setAdjustments(
        initialAdjustments ? { ...initialAdjustments } : { ...DEFAULT_POST_ADJUSTMENTS }
      );
      setShowSaveDialog(false);
      setShowFullscreen(false);
    }
  }, [open, initialAdjustments]);

  // Poll job status until complete - handles R2 URLs and legacy data URLs
  // Returns both the data URL (for display) and storage URL (for next edit)
  const pollJobStatus = useCallback(
    async (jobId: string): Promise<{ imageDataUrl: string; storageUrl?: string }> => {
      const maxAttempts = 120; // 2 minutes at 1 second intervals
      const pollInterval = 1000;

      /**
       * Helper to fetch image URL and convert to data URL
       */
      const fetchAsDataUrl = async (url: string): Promise<string> => {
        const proxyUrl = `/api/download-image?url=${encodeURIComponent(url)}`;
        const imgResponse = await fetch(proxyUrl);
        const blob = await imgResponse.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(blob);
        });
      };

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await fetch(`/api/jobs/${jobId}`);
          const data = await response.json();

          if (data.status === 'completed') {
            // New: R2 URL from temp storage (preferred)
            if (data.result?.editedImageUrl) {
              const imageDataUrl = await fetchAsDataUrl(data.result.editedImageUrl);
              // Return both the data URL and the R2 URL for next edit
              return { imageDataUrl, storageUrl: data.result.editedImageUrl };
            }
            // Legacy: data URL returned directly (no storage URL)
            if (data.result?.editedImageDataUrl) {
              return { imageDataUrl: data.result.editedImageDataUrl };
            }
            // Fallback: imageUrls if saved to R2 permanently
            if (data.result?.imageUrls?.[0]) {
              const imageDataUrl = await fetchAsDataUrl(data.result.imageUrls[0]);
              return { imageDataUrl, storageUrl: data.result.imageUrls[0] };
            }
            throw new Error('Job completed but no image returned');
          }

          if (data.status === 'failed') {
            throw new Error(data.error || 'Image edit failed');
          }

          // Still processing - wait and try again
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        } catch (err) {
          if (attempt === maxAttempts - 1) {
            throw err;
          }
          // Continue polling on transient errors
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }

      throw new Error('Timeout waiting for image edit to complete');
    },
    []
  );

  // Generate AI edit - inserts new revision below the current one
  const handleGenerateEdit = useCallback(async () => {
    if (!editPrompt.trim() || !currentImageUrl) return;

    // Need either a data URL or a storage URL from a previous revision
    const hasStorageUrl = !!currentRevision?.storageUrl;
    if (!currentImageUrl.startsWith('data:') && !hasStorageUrl) {
      setError('Image not loaded as data URL. Please wait for the image to load completely.');
      toast.error('Image not ready. Please try again.');
      return;
    }

    const promptText = editPrompt.trim();
    const generatingRevisionId = `generating-${Date.now()}`;
    const insertAfterIndex = currentRevisionIndex;

    setIsGenerating(true);
    setGeneratingPrompt(promptText);
    setError(null);

    // Insert a placeholder "generating" revision and select it
    const placeholderRevision: Revision = {
      id: generatingRevisionId,
      imageDataUrl: '', // Empty - indicates loading
      timestamp: Date.now(),
      prompt: promptText,
      parentIndex: insertAfterIndex,
    };

    setRevisions((prev) => {
      const next = [
        ...prev.slice(0, insertAfterIndex + 1),
        placeholderRevision,
        ...prev.slice(insertAfterIndex + 1),
      ];
      setCurrentRevisionIndex(insertAfterIndex + 1);
      return next;
    });

    setEditPrompt('');

    try {
      // Build request body - use storageUrl if available (skips re-upload)
      const requestBody: Record<string, unknown> = {
        prompt: promptText,
        editSessionId,
        productId,
      };

      if (hasStorageUrl) {
        requestBody.sourceImageUrl = currentRevision.storageUrl;
        console.log('Using existing R2 URL - skipping upload');
      } else {
        requestBody.baseImageDataUrl = currentImageUrl;
        console.log('Sending edit request with image length:', currentImageUrl.length);
      }

      // Step 1: Queue the edit job (preview mode with R2 temp storage)
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Failed to queue edit job');
      }

      console.log('Edit job queued:', data.jobId);
      toast.info('Editing image...');

      // Step 2: Poll for job completion (returns data URL + storage URL)
      const result = await pollJobStatus(data.jobId);

      // Step 3: Update the placeholder revision with the actual image and storage URL
      setRevisions((prev) => {
        return prev.map((rev) =>
          rev.id === generatingRevisionId
            ? {
                ...rev,
                id: `edit-${Date.now()}`,
                imageDataUrl: result.imageDataUrl,
                storageUrl: result.storageUrl,
              }
            : rev
        );
      });

      toast.success('Edit applied');
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate edit');
      toast.error('Failed to generate edit');

      // Remove the placeholder revision on error
      setRevisions((prev) => {
        const next = prev.filter((rev) => rev.id !== generatingRevisionId);
        // Go back to the previous revision
        setCurrentRevisionIndex(insertAfterIndex);
        return next;
      });
    } finally {
      setIsGenerating(false);
      setGeneratingPrompt(null);
    }
  }, [editPrompt, currentImageUrl, currentRevision, currentRevisionIndex, productId, pollJobStatus, editSessionId]);

  // Apply adjustments - creates new revision below current
  const handleApplyAdjustments = useCallback(async () => {
    if (!hasAdjustments(adjustments) || !currentImageUrl) return;

    setIsProcessingAdjustments(true);
    setError(null);

    try {
      const response = await fetch('/api/process-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: currentImageUrl,
          adjustments,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process adjustments');
      }

      const newRevision: Revision = {
        id: `adjustment-${Date.now()}`,
        imageDataUrl: data.processedImageDataUrl,
        timestamp: Date.now(),
        prompt: 'Applied adjustments',
        parentIndex: currentRevisionIndex,
      };

      setRevisions((prev) => {
        // Insert after current index
        const next = [
          ...prev.slice(0, currentRevisionIndex + 1),
          newRevision,
          ...prev.slice(currentRevisionIndex + 1),
        ];
        setCurrentRevisionIndex(currentRevisionIndex + 1);
        return next;
      });

      // Reset adjustments after applying
      setAdjustments({ ...DEFAULT_POST_ADJUSTMENTS });
      toast.success('Adjustments applied');
    } catch (err) {
      console.error('Failed to apply adjustments:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply adjustments');
      toast.error('Failed to apply adjustments');
    } finally {
      setIsProcessingAdjustments(false);
    }
  }, [adjustments, currentImageUrl, currentRevisionIndex]);

  // Select revision
  const handleSelectRevision = (index: number) => {
    setCurrentRevisionIndex(index);
  };

  // Delete revision
  const handleDeleteRevision = (index: number) => {
    if (index === 0) return; // Can't delete original

    setRevisions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Adjust current index if needed
      if (currentRevisionIndex >= index) {
        setCurrentRevisionIndex(Math.max(0, currentRevisionIndex - 1));
      }
      return next;
    });
  };

  // ===== INTERACTIVE CROP HANDLERS =====

  // Enter crop mode
  const handleEnterCropMode = useCallback(() => {
    setIsCropMode(true);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
    setCropAspectRatio('free');
  }, []);

  // Exit crop mode without applying
  const handleCancelCrop = useCallback(() => {
    setIsCropMode(false);
    setIsDragging(null);
    setDragStart(null);
  }, []);

  // Get aspect ratio numeric value
  const getAspectRatioValue = useCallback((ratioStr: string): number | null => {
    if (ratioStr === 'free' || ratioStr === 'custom') return null;
    const preset = ASPECT_RATIOS.find((ar) => ar.value === ratioStr);
    return preset?.ratio ?? null;
  }, []);

  // Handle aspect ratio change - adjust crop area to match
  const handleCropAspectChange = useCallback(
    (newRatio: string) => {
      setCropAspectRatio(newRatio);
      const ratio = getAspectRatioValue(newRatio);
      if (ratio) {
        // Adjust crop area to match new aspect ratio, keeping center
        const centerX = cropArea.x + cropArea.width / 2;
        const centerY = cropArea.y + cropArea.height / 2;
        let newWidth = cropArea.width;
        let newHeight = cropArea.width / ratio;

        // If height exceeds bounds, scale down
        if (newHeight > 90) {
          newHeight = 90;
          newWidth = newHeight * ratio;
        }
        if (newWidth > 90) {
          newWidth = 90;
          newHeight = newWidth / ratio;
        }

        // Calculate new position keeping center
        let newX = centerX - newWidth / 2;
        let newY = centerY - newHeight / 2;

        // Clamp to bounds
        newX = Math.max(0, Math.min(100 - newWidth, newX));
        newY = Math.max(0, Math.min(100 - newHeight, newY));

        setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
      }
    },
    [cropArea, getAspectRatioValue]
  );

  // Mouse down on crop area or handle
  const handleCropMouseDown = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(handle);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        crop: { ...cropArea },
      });
    },
    [cropArea]
  );

  // Mouse move during drag
  const handleCropMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStart || !imageContainerRef.current) return;

      const rect = imageContainerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;
      const ratio = getAspectRatioValue(cropAspectRatio);

      let newCrop = { ...dragStart.crop };

      if (isDragging === 'move') {
        // Move entire crop area
        newCrop.x = Math.max(0, Math.min(100 - newCrop.width, dragStart.crop.x + deltaX));
        newCrop.y = Math.max(0, Math.min(100 - newCrop.height, dragStart.crop.y + deltaY));
      } else {
        // Resize from corner
        const isLeft = isDragging.includes('w');
        const isTop = isDragging.includes('n');

        if (isLeft) {
          const newX = Math.max(0, dragStart.crop.x + deltaX);
          const widthChange = dragStart.crop.x - newX;
          newCrop.x = newX;
          newCrop.width = Math.max(10, dragStart.crop.width + widthChange);
        } else {
          newCrop.width = Math.max(10, Math.min(100 - newCrop.x, dragStart.crop.width + deltaX));
        }

        if (isTop) {
          const newY = Math.max(0, dragStart.crop.y + deltaY);
          const heightChange = dragStart.crop.y - newY;
          newCrop.y = newY;
          newCrop.height = Math.max(10, dragStart.crop.height + heightChange);
        } else {
          newCrop.height = Math.max(10, Math.min(100 - newCrop.y, dragStart.crop.height + deltaY));
        }

        // Maintain aspect ratio if set
        if (ratio) {
          const currentRatio = newCrop.width / newCrop.height;
          if (Math.abs(currentRatio - ratio) > 0.01) {
            // Adjust based on which dimension changed more
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              newCrop.height = newCrop.width / ratio;
            } else {
              newCrop.width = newCrop.height * ratio;
            }
            // Clamp to bounds
            if (newCrop.x + newCrop.width > 100) newCrop.width = 100 - newCrop.x;
            if (newCrop.y + newCrop.height > 100) newCrop.height = 100 - newCrop.y;
          }
        } else {
          // Free aspect - switch to custom
          if (cropAspectRatio !== 'custom' && cropAspectRatio !== 'free') {
            setCropAspectRatio('custom');
          }
        }
      }

      setCropArea(newCrop);
    },
    [isDragging, dragStart, cropAspectRatio, getAspectRatioValue]
  );

  // Mouse up - end drag
  const handleCropMouseUp = useCallback(() => {
    setIsDragging(null);
    setDragStart(null);
  }, []);

  // Apply crop - send to API
  const handleApplyCrop = useCallback(async () => {
    if (!currentImageUrl) return;

    setIsProcessingCrop(true);
    setError(null);

    try {
      const response = await fetch('/api/image-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: currentImageUrl,
          operation: 'crop-interactive',
          cropArea, // Send the percentages
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to crop image');
      }

      const aspectLabel =
        cropAspectRatio === 'free' || cropAspectRatio === 'custom'
          ? 'custom area'
          : cropAspectRatio;

      const newRevision: Revision = {
        id: `crop-${Date.now()}`,
        imageDataUrl: data.imageDataUrl,
        timestamp: Date.now(),
        prompt: `Cropped to ${aspectLabel}`,
        parentIndex: currentRevisionIndex,
      };

      setRevisions((prev) => {
        const next = [
          ...prev.slice(0, currentRevisionIndex + 1),
          newRevision,
          ...prev.slice(currentRevisionIndex + 1),
        ];
        setCurrentRevisionIndex(currentRevisionIndex + 1);
        return next;
      });

      setIsCropMode(false);
      toast.success('Image cropped');
    } catch (err) {
      console.error('Failed to crop:', err);
      setError(err instanceof Error ? err.message : 'Failed to crop image');
      toast.error('Failed to crop image');
    } finally {
      setIsProcessingCrop(false);
    }
  }, [currentImageUrl, currentRevisionIndex, cropArea, cropAspectRatio]);

  // Overwrite original image (base image or generated asset)
  const handleOverwrite = useCallback(async () => {
    if (!currentRevision || isOriginal) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/edit-image/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: currentRevision.imageDataUrl,
          imageType,
          mode: 'overwrite',
          assetId: imageType === 'generated' ? imageId : undefined,
          productImageId: imageType === 'base' ? imageId : undefined,
          productId,
          prompt: currentRevision.prompt,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save image');
      }

      // Show appropriate message based on sync status
      if (imageType === 'base' && isSyncedWithStore) {
        if (data.unsyncedFromStore) {
          // Failed to update store
          toast.warning('Image saved locally but could not update store. Image is now unsynced.', {
            icon: <CloudOff className="h-4 w-4" />,
          });
        } else {
          // Successfully updated store
          toast.success('Image saved and store updated successfully', {
            icon: <Store className="h-4 w-4" />,
          });
        }
      } else {
        toast.success('Image saved successfully');
      }

      // Notify parent
      onSave({
        mode: 'overwrite',
        imageDataUrl: currentRevision.imageDataUrl,
        imageUrl: data.imageUrl,
      });

      setShowSaveDialog(false);
      onOpenChange(false);
    } catch (err) {
      console.error('Save failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
      toast.error('Failed to save image');
    } finally {
      setIsSaving(false);
    }
  }, [currentRevision, isOriginal, imageType, imageId, productId, onSave, onOpenChange]);

  // Save as a new generated asset (copy)
  const handleSaveAsCopy = useCallback(async () => {
    if (!currentRevision || isOriginal) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/edit-image/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: currentRevision.imageDataUrl,
          imageType: 'generated', // Always create as generated asset
          mode: 'copy',
          productId,
          flowId, // Link to generation flow if available
          prompt: currentRevision.prompt,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save copy');
      }

      toast.success('Saved as new generated asset');

      // Notify parent
      onSave({
        mode: 'copy',
        imageDataUrl: currentRevision.imageDataUrl,
        imageUrl: data.imageUrl,
        assetId: data.imageId,
      });

      setShowSaveDialog(false);
      onOpenChange(false);
    } catch (err) {
      console.error('Save as copy failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save copy');
      toast.error('Failed to save copy');
    } finally {
      setIsSaving(false);
    }
  }, [currentRevision, isOriginal, productId, flowId, onSave, onOpenChange]);

  const testId = buildTestId('image-editor-modal');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="bg-black/90" />
          <div
            className={cn(
              'fixed inset-4 z-50 mx-auto flex max-w-6xl overflow-hidden rounded-lg border bg-card shadow-2xl',
              'md:inset-8'
            )}
            data-testid={testId}
          >
            {/* Left: Vertical Revision List */}
            <div
              className="flex w-24 flex-col gap-2 overflow-y-auto border-r bg-muted/30 p-2"
              data-testid={buildTestId(testId, 'revision-list')}
            >
              <span className="mb-1 px-1 text-xs font-medium text-muted-foreground">Revisions</span>
              {revisions.map((revision, index) => {
                const isLoading = !revision.imageDataUrl;
                return (
                  <button
                    key={revision.id}
                    type="button"
                    onClick={() => handleSelectRevision(index)}
                    className={cn(
                      'group relative aspect-square w-full overflow-hidden rounded border-2 transition-all',
                      index === currentRevisionIndex
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50',
                      isLoading && 'animate-pulse border-dashed bg-muted'
                    )}
                    title={
                      revision.prompt || (index === 0 ? 'Original image' : `Revision ${index}`)
                    }
                    data-testid={buildTestId(testId, 'revision', String(index))}
                  >
                    {isLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-[8px] text-muted-foreground">Generating</span>
                      </div>
                    ) : (
                      <img
                        src={revision.imageDataUrl}
                        alt={index === 0 ? 'Original' : `Revision ${index}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                    {index === currentRevisionIndex && !isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {index > 0 && !isLoading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRevision(index);
                        }}
                        className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[9px] text-white">
                      {index === 0 ? 'Original' : `#${index}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Center: Image Preview */}
            <div className="flex flex-1 flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <DialogTitle className="text-lg font-semibold">Image Editor</DialogTitle>
                <div className="flex items-center gap-2">
                  {!isOriginal && (
                    <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                      Revision {currentRevisionIndex}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="gap-1.5"
                    data-testid={buildTestId(testId, 'close')}
                  >
                    <X className="h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>

              {/* Prompt Header - shows the prompt that created this revision */}
              {currentRevision?.prompt && (
                <div
                  className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2"
                  data-testid={buildTestId(testId, 'prompt-header')}
                >
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <span
                    className="truncate text-sm text-muted-foreground"
                    title={currentRevision.prompt}
                  >
                    {currentRevision.prompt}
                  </span>
                </div>
              )}

              {/* Main Preview */}
              <div
                ref={imageContainerRef}
                className={cn(
                  'relative flex flex-1 items-center justify-center overflow-hidden bg-black/50 p-4',
                  !isCropMode && !isRevisionGenerating && 'cursor-pointer'
                )}
                onClick={() => !isCropMode && !isRevisionGenerating && setShowFullscreen(true)}
                onMouseMove={isCropMode ? handleCropMouseMove : undefined}
                onMouseUp={isCropMode ? handleCropMouseUp : undefined}
                onMouseLeave={isCropMode ? handleCropMouseUp : undefined}
                data-testid={buildTestId(testId, 'preview')}
              >
                {isRevisionGenerating ? (
                  <div
                    className="flex flex-col items-center gap-4"
                    data-testid={buildTestId(testId, 'preview-loading')}
                  >
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-white">Generating edit...</p>
                      {currentRevision?.prompt && (
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                          &quot;{currentRevision.prompt}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  currentImageUrl && (
                    <div className="relative inline-block max-h-full max-w-full">
                      <img
                        src={currentImageUrl}
                        alt="Image to edit"
                        className="max-h-full max-w-full object-contain"
                        style={{
                          filter:
                            activeTab === 'adjustments'
                              ? generateFilterString(adjustments)
                              : 'none',
                        }}
                        draggable={false}
                      />
                      {/* Crop overlay */}
                      {isCropMode && (
                        <div
                          className="absolute inset-0"
                          data-testid={buildTestId(testId, 'crop-overlay')}
                        >
                          {/* Darkened areas outside crop */}
                          <div
                            className="absolute bg-black/60"
                            style={{ top: 0, left: 0, right: 0, height: `${cropArea.y}%` }}
                          />
                          <div
                            className="absolute bg-black/60"
                            style={{
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: `${100 - cropArea.y - cropArea.height}%`,
                            }}
                          />
                          <div
                            className="absolute bg-black/60"
                            style={{
                              top: `${cropArea.y}%`,
                              left: 0,
                              width: `${cropArea.x}%`,
                              height: `${cropArea.height}%`,
                            }}
                          />
                          <div
                            className="absolute bg-black/60"
                            style={{
                              top: `${cropArea.y}%`,
                              right: 0,
                              width: `${100 - cropArea.x - cropArea.width}%`,
                              height: `${cropArea.height}%`,
                            }}
                          />
                          {/* Crop area */}
                          <div
                            className="absolute cursor-move border-2 border-white"
                            style={{
                              left: `${cropArea.x}%`,
                              top: `${cropArea.y}%`,
                              width: `${cropArea.width}%`,
                              height: `${cropArea.height}%`,
                            }}
                            onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                            data-testid={buildTestId(testId, 'crop-area')}
                          >
                            {/* Grid lines */}
                            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                              <div className="border-b border-r border-white/30" />
                              <div className="border-b border-r border-white/30" />
                              <div className="border-b border-white/30" />
                              <div className="border-b border-r border-white/30" />
                              <div className="border-b border-r border-white/30" />
                              <div className="border-b border-white/30" />
                              <div className="border-r border-white/30" />
                              <div className="border-r border-white/30" />
                              <div />
                            </div>
                            {/* Corner handles */}
                            <div
                              className="absolute -left-1.5 -top-1.5 h-3 w-3 cursor-nw-resize border-2 border-white bg-primary"
                              onMouseDown={(e) => handleCropMouseDown(e, 'nw')}
                            />
                            <div
                              className="absolute -right-1.5 -top-1.5 h-3 w-3 cursor-ne-resize border-2 border-white bg-primary"
                              onMouseDown={(e) => handleCropMouseDown(e, 'ne')}
                            />
                            <div
                              className="absolute -bottom-1.5 -left-1.5 h-3 w-3 cursor-sw-resize border-2 border-white bg-primary"
                              onMouseDown={(e) => handleCropMouseDown(e, 'sw')}
                            />
                            <div
                              className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize border-2 border-white bg-primary"
                              onMouseDown={(e) => handleCropMouseDown(e, 'se')}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
                {activeTab === 'adjustments' &&
                  hasAdjustments(adjustments) &&
                  !isCropMode &&
                  !isRevisionGenerating && (
                    <div className="absolute right-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
                      Preview
                    </div>
                  )}
                {!isCropMode && !isRevisionGenerating && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullscreen(true);
                    }}
                    className="absolute bottom-3 right-3 rounded bg-black/60 p-2 text-white hover:bg-black/80"
                    data-testid={buildTestId(testId, 'fullscreen')}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Footer: Crop Actions */}
              <div
                className="flex items-center gap-3 border-t bg-muted/30 px-4 py-3"
                data-testid={buildTestId(testId, 'transform-footer')}
              >
                {isCropMode ? (
                  <>
                    {/* Crop Mode Toolbar */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Aspect:</span>
                      <Select value={cropAspectRatio} onValueChange={handleCropAspectChange}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASPECT_RATIOS.map((ar) => (
                            <SelectItem key={ar.value} value={ar.value} className="text-xs">
                              {ar.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1" />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelCrop}
                      disabled={isProcessingCrop}
                      data-testid={buildTestId(testId, 'crop-cancel')}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApplyCrop}
                      disabled={isProcessingCrop}
                      className="gap-1.5"
                      data-testid={buildTestId(testId, 'crop-apply')}
                    >
                      {isProcessingCrop ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Apply Crop
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Normal Mode - Single Crop Button */}
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnterCropMode}
                      disabled={!currentImageUrl}
                      className="gap-1.5"
                      data-testid={buildTestId(testId, 'crop-btn')}
                    >
                      <Crop className="h-3.5 w-3.5" />
                      Crop
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right: Editor Panel */}
            <div className="flex w-80 flex-col border-l">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'edit' | 'adjustments')}
                className="flex flex-1 flex-col"
              >
                <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2">
                  <TabsTrigger value="edit" className="gap-1.5">
                    <Pencil className="h-4 w-4" />
                    AI Edit
                  </TabsTrigger>
                  <TabsTrigger value="adjustments" className="gap-1.5">
                    <Sliders className="h-4 w-4" />
                    Adjust
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto p-4">
                  <TabsContent value="edit" className="mt-0 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Edit Instructions</label>
                      <Textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Describe the changes you want to make..."
                        rows={4}
                        data-testid={buildTestId(testId, 'edit-prompt')}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use AI to make targeted edits. New revision will appear below the current one.
                    </p>
                  </TabsContent>

                  <TabsContent value="adjustments" className="mt-0 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Adjust light, color, and effects. Preview in real-time, then apply as new
                      revision.
                    </p>
                    <PostAdjustmentsPanel adjustments={adjustments} onChange={setAdjustments} />
                  </TabsContent>
                </div>

                {/* Footer Actions */}
                <div className="space-y-2 border-t p-4">
                  {activeTab === 'edit' ? (
                    <Button
                      className="w-full"
                      onClick={handleGenerateEdit}
                      disabled={isGenerating || !editPrompt.trim()}
                      data-testid={buildTestId(testId, 'generate-btn')}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Edit
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={handleApplyAdjustments}
                      disabled={!hasAdjustments(adjustments) || isProcessingAdjustments}
                      data-testid={buildTestId(testId, 'apply-adjustments-btn')}
                    >
                      {isProcessingAdjustments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Apply Adjustments
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => setShowSaveDialog(true)}
                    disabled={!hasEdits || isOriginal}
                    data-testid={buildTestId(testId, 'save-btn')}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Apply Edit
                  </Button>
                </div>
              </Tabs>
            </div>
          </div>
        </DialogPortal>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-lg" testId={buildTestId(testId, 'save-dialog')}>
          <DialogHeader>
            <DialogTitle>Apply Edit</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview comparison */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex-shrink-0 text-center">
                {revisions[0]?.imageDataUrl && (
                  <img
                    src={revisions[0].imageDataUrl}
                    alt="Original"
                    className="h-24 w-24 rounded border object-cover"
                  />
                )}
                <span className="mt-1 block text-xs text-muted-foreground">Original</span>
              </div>
              <span className="flex-shrink-0 text-muted-foreground">→</span>
              <div className="flex-shrink-0 text-center">
                {currentRevision?.imageDataUrl && (
                  <img
                    src={currentRevision.imageDataUrl}
                    alt="Edited"
                    className="h-24 w-24 rounded border object-cover"
                  />
                )}
                <span className="mt-1 block text-xs text-muted-foreground">
                  Revision {currentRevisionIndex}
                </span>
              </div>
            </div>

            {/* Store sync warning */}
            {isSyncedWithStore && (
              <div
                className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                data-testid={buildTestId(testId, 'store-sync-warning')}
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">This image is synced with your store</p>
                  <p className="mt-1 text-amber-700 dark:text-amber-300">
                    Overwriting will change the image displayed on your store. The change will be
                    visible to customers.
                  </p>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">Choose how to save the edited image:</p>

            <div className="flex flex-col gap-2">
              {/* Overwrite option */}
              <Button
                variant="outline"
                onClick={handleOverwrite}
                disabled={isSaving}
                className={cn(
                  'h-auto w-full flex-col items-start gap-1.5 p-3',
                  isSyncedWithStore &&
                    'border-amber-300 hover:border-amber-400 dark:border-amber-800'
                )}
                data-testid={buildTestId(testId, 'save-overwrite')}
              >
                <div className="flex w-full items-center gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  ) : isSyncedWithStore ? (
                    <Store className="h-4 w-4 flex-shrink-0 text-amber-600" />
                  ) : (
                    <RefreshCw className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="font-medium">
                    {isSyncedWithStore
                      ? 'Overwrite & Update Store'
                      : imageType === 'base'
                        ? 'Overwrite Base Image'
                        : 'Overwrite Asset'}
                  </span>
                </div>
                <span className="w-full break-words text-left text-xs font-normal leading-relaxed text-muted-foreground">
                  {isSyncedWithStore
                    ? 'This will replace the image in your platform AND update your store. Customers will see the new image immediately.'
                    : imageType === 'base'
                      ? 'Replace the original product image'
                      : 'Replace the existing generated asset'}
                </span>
              </Button>

              {/* Save as Copy option */}
              <Button
                onClick={handleSaveAsCopy}
                disabled={isSaving}
                className="h-auto w-full flex-col items-start gap-1.5 p-3"
                data-testid={buildTestId(testId, 'save-copy')}
              >
                <div className="flex w-full items-center gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="font-medium">Save as New Asset</span>
                </div>
                <span className="w-full break-words text-left text-xs font-normal leading-relaxed text-muted-foreground">
                  {isSyncedWithStore
                    ? 'Keep the original synced image unchanged. Save edit as a new generated asset.'
                    : flowId
                      ? 'Create a new generated asset in this flow'
                      : 'Create a new generated asset for this product'}
                </span>
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/95" />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            onClick={() => setShowFullscreen(false)}
            data-testid={buildTestId(testId, 'fullscreen-preview')}
          >
            {currentImageUrl && (
              <img
                src={currentImageUrl}
                alt="Fullscreen preview"
                className="max-h-full max-w-full object-contain"
                style={{
                  filter: activeTab === 'adjustments' ? generateFilterString(adjustments) : 'none',
                }}
              />
            )}
            <button
              type="button"
              onClick={() => setShowFullscreen(false)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </DialogPortal>
      </Dialog>
    </>
  );
}
