'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Layers, MessageCircle, CheckSquare, Square, Play, Loader2, Pencil, Check, X, Settings, Menu } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useData } from '@/lib/contexts/DataContext';
import type { ClientSession, Product, Flow, FlowGenerationSettings, FlowGeneratedImage, PostAdjustments } from '@/lib/types/app-types';
import { FlowCard, type DraggedConfig, type DraggedProduct } from './FlowCard';
import { FlowSettingsPanel } from './FlowSettingsPanel';
import { SceneLibraryModal } from './SceneLibraryModal';
import { FlowAssistant } from './FlowAssistant';
import { DebugPromptModal } from './DebugPromptModal';
import { ImageEditorModal } from './ImageEditorModal';
import * as S3Service from '@/lib/services/s3/browser';
import { buildSystemImageGenerationPrompt } from '@/lib/services/prompt-builder';
import { OPEN_NAV_DRAWER_EVENT } from '@/components/NavigationDrawer/NavigationDrawer';
import styles from './SceneStudioView.module.scss';

interface SceneStudioViewProps {
  clientId: string;
  clientSession: ClientSession;
  products: Product[];
  onImageClick?: (imageUrl: string) => void;
}

// Build prompt from flow settings and products
function buildPromptFromSettings(products: Product[], _settings: FlowGenerationSettings): string {
  const productNames = products.map((p) => p.name).join(', ');

  return `Generate a professional product visualization featuring: ${productNames}.`;
}

function buildProductImageRefs(products: Product[], selectedBaseImages: { [productId: string]: string }) {
  return products
    .map((product) => {
      const selectedImageId = selectedBaseImages[product.id] || product.productImageIds?.[0];
      return selectedImageId ? { productId: product.id, imageId: selectedImageId } : null;
    })
    .filter((entry): entry is { productId: string; imageId: string } => Boolean(entry));
}

export function SceneStudioView({ clientId, clientSession, products, onImageClick }: SceneStudioViewProps) {
  const {
    addFlowToClientSession,
    updateFlowInClientSession,
    deleteFlowFromClientSession,
    addProductsToFlow,
    removeProductFromFlow,
    updateFlowSettings,
    toggleFavoriteGeneratedImage,
    toggleSceneImage,
    getClient,
    updateClientSession,
  } = useData();

  // Get client's AI model configuration for generation
  const client = getClient(clientId);
  const modelOverrides = client?.aiModelConfig
    ? {
      imageModel: client.aiModelConfig.imageModel,
      fallbackImageModel: client.aiModelConfig.fallbackImageModel,
    }
    : undefined;

  // Multi-selection state
  const [selectedFlowIds, setSelectedFlowIds] = useState<Set<string>>(new Set());
  const [sceneLibraryOpen, setSceneLibraryOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [debugFlowId, setDebugFlowId] = useState<string | null>(null);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  const [editorAspectRatio, setEditorAspectRatio] = useState<string | null>(null);
  const [editorFlowId, setEditorFlowId] = useState<string | null>(null);
  const [editorInitialAdjustments, setEditorInitialAdjustments] = useState<PostAdjustments | undefined>(undefined);
  // Track products being moved (for optimistic UI - immediately hide from source flow)
  const [movingProducts, setMovingProducts] = useState<Set<string>>(new Set());

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(clientSession.name);

  // Uploaded scenes (local state - will persist via session storage)
  const [uploadedScenes, setUploadedScenes] = useState<Array<{
    id: string;
    name: string;
    imageUrl: string;
    uploadedAt: string;
  }>>([]);

  // Responsive settings panel state
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);

  // Check viewport width for responsive behavior
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrowViewport(window.innerWidth <= 1200);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Close settings panel when clicking outside on narrow viewport
  useEffect(() => {
    if (isNarrowViewport && settingsPanelOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSettingsPanelOpen(false);
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isNarrowViewport, settingsPanelOpen]);

  // Add body class to hide NavigationDrawer's default hamburger when SceneStudioView is active
  useEffect(() => {
    document.body.classList.add('scene-studio-active');
    return () => document.body.classList.remove('scene-studio-active');
  }, []);

  const flows = clientSession.flows || [];

  // Get selected flows
  const selectedFlows = useMemo(() => {
    return flows.filter((f) => selectedFlowIds.has(f.id));
  }, [flows, selectedFlowIds]);

  // For single selection backwards compatibility
  const selectedFlowId = selectedFlowIds.size === 1 ? Array.from(selectedFlowIds)[0] : null;
  const selectedFlow = selectedFlowId ? flows.find((f) => f.id === selectedFlowId) : null;

  // Handle rename
  const handleStartRename = useCallback(() => {
    setRenameValue(clientSession.name);
    setIsRenaming(true);
  }, [clientSession.name]);

  const handleCancelRename = useCallback(() => {
    setIsRenaming(false);
    setRenameValue(clientSession.name);
  }, [clientSession.name]);

  const handleSaveRename = useCallback(async () => {
    const trimmedName = renameValue.trim();
    if (trimmedName && trimmedName !== clientSession.name) {
      try {
        await updateClientSession(clientId, clientSession.id, { name: trimmedName });
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    }
    setIsRenaming(false);
  }, [renameValue, clientSession.name, clientSession.id, clientId, updateClientSession]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  }, [handleSaveRename, handleCancelRename]);

  // Handle flow click with multi-selection support
  const handleFlowSelect = useCallback((flowId: string, event?: React.MouseEvent) => {
    const flowIndex = flows.findIndex((f) => f.id === flowId);

    if (event?.metaKey || event?.ctrlKey) {
      // Cmd/Ctrl+click: toggle selection
      setSelectedFlowIds((prev) => {
        const next = new Set(prev);
        if (next.has(flowId)) {
          next.delete(flowId);
        } else {
          next.add(flowId);
        }
        return next;
      });
      setLastSelectedIndex(flowIndex);
    } else if (event?.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: range selection
      const start = Math.min(lastSelectedIndex, flowIndex);
      const end = Math.max(lastSelectedIndex, flowIndex);
      const rangeFlowIds = flows.slice(start, end + 1).map((f) => f.id);
      setSelectedFlowIds((prev) => {
        const next = new Set(prev);
        rangeFlowIds.forEach((id) => next.add(id));
        return next;
      });
    } else {
      // Regular click: single selection
      setSelectedFlowIds(new Set([flowId]));
      setLastSelectedIndex(flowIndex);
    }
  }, [flows, lastSelectedIndex]);

  // Select all flows
  const handleSelectAll = useCallback(() => {
    if (selectedFlowIds.size === flows.length) {
      // All selected, deselect all
      setSelectedFlowIds(new Set());
    } else {
      // Select all
      setSelectedFlowIds(new Set(flows.map((f) => f.id)));
    }
  }, [flows, selectedFlowIds.size]);

  // Handle adding a new flow
  const handleAddFlow = useCallback(async () => {
    try {
      const newFlow = await addFlowToClientSession(clientId, clientSession.id);
      setSelectedFlowIds(new Set([newFlow.id]));
    } catch (error) {
      console.error('Failed to add flow:', error);
    }
  }, [clientId, clientSession.id, addFlowToClientSession]);

  // Handle removing a product from a flow
  const handleRemoveProduct = useCallback(
    async (flowId: string, productId: string) => {
      try {
        await removeProductFromFlow(clientId, clientSession.id, flowId, productId);
      } catch (error) {
        console.error('Failed to remove product from flow:', error);
      }
    },
    [clientId, clientSession.id, removeProductFromFlow]
  );

  // Handle deleting a flow
  const handleDeleteFlow = useCallback(
    async (flowId: string) => {
      try {
        await deleteFlowFromClientSession(clientId, clientSession.id, flowId);
        setSelectedFlowIds((prev) => {
          const next = new Set(prev);
          next.delete(flowId);
          return next;
        });
      } catch (error) {
        console.error('Failed to delete flow:', error);
      }
    },
    [clientId, clientSession.id, deleteFlowFromClientSession]
  );

  const pollForFlowCompletion = useCallback(
    async (flow: Flow, prompt: string, jobId: string, attempts = 0): Promise<void> => {
      if (attempts > 60) {
        throw new Error('Generation timeout');
      }

      const statusResponse = await fetch(`/api/generate-images/${jobId}`);
      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        const imageFilename = statusData.imageIds?.[0] || '';
        const imageId = imageFilename ? imageFilename.replace(/\.[^/.]+$/, '') : '';

        const newGeneratedImage: FlowGeneratedImage = {
          id: uuidv4(),
          imageId,
          imageFilename,
          timestamp: new Date().toISOString(),
          productIds: flow.productIds,
          settings: { ...flow.settings },
          prompt,
          jobId,
        };

        await updateFlowInClientSession(clientId, clientSession.id, flow.id, {
          status: 'completed',
          generatedImages: [newGeneratedImage, ...flow.generatedImages],
          currentImageIndex: 0,
        });

        console.log('✅ Flow generation completed');
      } else if (statusData.status === 'error' || statusData.status === 'failed') {
        await updateFlowInClientSession(clientId, clientSession.id, flow.id, {
          status: 'error',
        });
        console.error('❌ Generation failed:', statusData.error);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return pollForFlowCompletion(flow, prompt, jobId, attempts + 1);
      }
    },
    [clientId, clientSession.id, updateFlowInClientSession]
  );

  const handleBatchExecuteFlows = useCallback(
    async (targetFlows: Flow[]) => {
      const executableFlows = targetFlows.filter(
        (flow) => flow.productIds.length > 0 && flow.status !== 'generating'
      );

      if (executableFlows.length === 0) {
        console.log('⚠️ No flows ready to execute');
        return;
      }

      const flowEntries = executableFlows.map((flow) => {
        const flowProducts = products.filter((product) => flow.productIds.includes(product.id));
        const basePrompt = buildPromptFromSettings(flowProducts, flow.settings);
        const customPrompt = flow.settings.customPrompt?.trim();
        const prompt = customPrompt || basePrompt;
        const productImageIds = buildProductImageRefs(flowProducts, flow.selectedBaseImages);
        const flowModelOverrides = {
          ...modelOverrides,
          ...(flow.settings.imageModel && { imageModel: flow.settings.imageModel }),
        };

        return { flow, prompt, productImageIds, flowModelOverrides, flowProducts };
      });

      try {
        await Promise.all(
          flowEntries.map(({ flow }) =>
            updateFlowInClientSession(clientId, clientSession.id, flow.id, { status: 'generating' })
          )
        );

        const requests = flowEntries.map(({ flow, prompt, productImageIds, flowModelOverrides, flowProducts }) => {
          console.log('🚀 Executing flow:', flow.id);
          console.log('   Products:', flowProducts.map((p) => p.name).join(', '));
          console.log('   Prompt:', prompt);
          console.log('   Scene/Inspiration Image:', flow.settings.sceneImageUrl || 'none');
          console.log('   Model:', flow.settings.imageModel || 'default');
          console.log('   Selected Base Images:', flow.selectedBaseImages);

          return {
            flowId: flow.id,
            clientId,
            productId: flow.productIds[0],
            sessionId: clientSession.id,
            prompt,
            settings: {
              ...flow.settings,
              numberOfVariants: 1,
            },
            productImageIds,
            inspirationImageUrl: flow.settings.sceneImageUrl || undefined,
            isClientSession: true,
            modelOverrides: flowModelOverrides,
          };
        });

        const response = await fetch('/api/batch-generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        });

        if (!response.ok) {
          throw new Error('Generation request failed');
        }

        const data = await response.json();
        console.log('✅ Generation jobs enqueued:', data);

        const entryByFlowId = new Map(flowEntries.map((entry) => [entry.flow.id, entry]));

        for (const result of data.results || []) {
          const entry = entryByFlowId.get(result.flowId);
          if (!entry) {
            console.warn('⚠️ Missing flow entry for result:', result.flowId);
            continue;
          }

          if (result.success && result.jobId) {
            pollForFlowCompletion(entry.flow, entry.prompt, result.jobId);
          } else {
            await updateFlowInClientSession(clientId, clientSession.id, entry.flow.id, { status: 'error' });
          }
        }
      } catch (error) {
        console.error('Failed to execute flows:', error);
        await Promise.all(
          flowEntries.map(({ flow }) =>
            updateFlowInClientSession(clientId, clientSession.id, flow.id, { status: 'error' })
          )
        );
      }
    },
    [clientId, clientSession.id, modelOverrides, pollForFlowCompletion, products, updateFlowInClientSession]
  );

  // Handle executing a flow (generation)
  const handleExecuteFlow = useCallback(
    async (flowId: string) => {
      const flow = flows.find((f) => f.id === flowId);
      if (!flow) return;
      await handleBatchExecuteFlows([flow]);
    },
    [flows, handleBatchExecuteFlows]
  );

  // Handle updating flow settings - supports multi-selection
  const handleUpdateSettings = useCallback(
    async (settings: Partial<FlowGenerationSettings>) => {
      if (selectedFlowIds.size === 0) return;

      try {
        // Update all selected flows
        await Promise.all(
          Array.from(selectedFlowIds).map((flowId) =>
            updateFlowSettings(clientId, clientSession.id, flowId, settings)
          )
        );
      } catch (error) {
        console.error('Failed to update flow settings:', error);
      }
    },
    [clientId, clientSession.id, selectedFlowIds, updateFlowSettings]
  );

  const handleSaveCustomPrompt = useCallback(
    async (flowId: string, prompt: string) => {
      await updateFlowSettings(clientId, clientSession.id, flowId, {
        customPrompt: prompt.trim(),
      });
    },
    [clientId, clientSession.id, updateFlowSettings]
  );

  const handleRestoreSystemPrompt = useCallback(
    async (flowId: string) => {
      await updateFlowSettings(clientId, clientSession.id, flowId, {
        customPrompt: '',
      });
    },
    [clientId, clientSession.id, updateFlowSettings]
  );

  // Handle updating shared prompt prefix for multi-selection
  const handleUpdateSharedPrompt = useCallback(
    async (sharedPrompt: string) => {
      if (selectedFlowIds.size === 0) return;

      try {
        // For multi-selection, prepend the shared prompt to each flow's existing prompt
        await Promise.all(
          Array.from(selectedFlowIds).map(async (flowId) => {
            const flow = flows.find((f) => f.id === flowId);
            if (flow) {
              const existingPrompt = flow.settings.promptText || '';
              // Don't duplicate if the prompt already starts with the shared text
              const newPrompt = existingPrompt.startsWith(sharedPrompt)
                ? existingPrompt
                : sharedPrompt ? `${sharedPrompt}\n\n${existingPrompt}`.trim() : existingPrompt;
              await updateFlowSettings(clientId, clientSession.id, flowId, { promptText: newPrompt });
            }
          })
        );
      } catch (error) {
        console.error('Failed to update shared prompt:', error);
      }
    },
    [clientId, clientSession.id, selectedFlowIds, flows, updateFlowSettings]
  );

  // Handle scene selection (now receives both URL and name)
  const handleSelectScene = useCallback(
    (sceneImageUrl: string, sceneName?: string) => {
      handleUpdateSettings({
        sceneImageUrl: sceneImageUrl || undefined,
        scene: sceneName || (sceneImageUrl ? 'Custom Scene' : undefined)
      });
    },
    [handleUpdateSettings]
  );

  // Handle toggling favorite for a generated image
  const handleToggleFavorite = useCallback(
    async (imageId: string, productId: string) => {
      try {
        await toggleFavoriteGeneratedImage(clientId, productId, imageId, clientSession.id);
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    },
    [clientId, clientSession.id, toggleFavoriteGeneratedImage]
  );

  // Check if an image is favorited for a product
  // TODO: Implement using pinned field on generated_asset
  const checkIsFavorite = useCallback(
    (_imageId: string, _productId: string): boolean => {
      return false; // Favorites now tracked via pinned on generated_asset
    },
    []
  );

  // Handle toggling scene for a generated image
  const handleToggleScene = useCallback(
    async (imageId: string, productId: string) => {
      try {
        await toggleSceneImage(clientId, productId, imageId, clientSession.id);
      } catch (error) {
        console.error('Failed to toggle scene:', error);
      }
    },
    [clientId, clientSession.id, toggleSceneImage]
  );

  // Check if an image is a scene for a product
  // TODO: Implement using pinned field on generated_asset
  const checkIsScene = useCallback(
    (_imageId: string, _productId: string): boolean => {
      return false; // Scenes now tracked via pinned on generated_asset
    },
    []
  );

  // Handle uploading a scene image
  const handleUploadScene = useCallback(
    async (file: File) => {
      try {
        // Create a unique ID for this scene
        const sceneId = `scene-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const extension = file.name.split('.').pop() || 'jpg';
        const fileName = `${sceneId}.${extension}`;

        // Upload to S3 via API
        const formData = new FormData();
        formData.append('file', file, fileName);
        formData.append('clientId', clientId);
        formData.append('sessionId', clientSession.id);
        formData.append('imageId', fileName);

        const response = await fetch('/api/upload-generated-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload scene');
        }

        const data = await response.json();
        const imageUrl = data.imageUrl || S3Service.getImageUrl(
          S3Service.S3Paths.getClientSessionMediaFilePath(clientId, clientSession.id, fileName)
        );

        // Add to local state
        setUploadedScenes((prev) => [
          ...prev,
          {
            id: sceneId,
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            imageUrl,
            uploadedAt: new Date().toISOString(),
          },
        ]);

        console.log('✅ Scene uploaded:', fileName);
      } catch (error) {
        console.error('Failed to upload scene:', error);
        throw error;
      }
    },
    [clientId, clientSession.id]
  );

  // Handle deleting an uploaded scene
  const handleDeleteUploadedScene = useCallback((sceneId: string) => {
    setUploadedScenes((prev) => prev.filter((scene) => scene.id !== sceneId));
  }, []);

  // Handle history navigation
  const handleHistorySelect = useCallback(
    async (flowId: string, imageIndex: number) => {
      try {
        await updateFlowInClientSession(clientId, clientSession.id, flowId, {
          currentImageIndex: imageIndex,
        });
      } catch (error) {
        console.error('Failed to update history index:', error);
      }
    },
    [clientId, clientSession.id, updateFlowInClientSession]
  );

  // Handle opening the image editor
  const handleEditImage = useCallback(
    (imageUrl: string, flowId: string) => {
      const flow = flows.find((candidate) => candidate.id === flowId);
      const currentImage = flow?.generatedImages[flow.currentImageIndex];
      const aspectRatio = currentImage?.settings?.aspectRatio || flow?.settings?.aspectRatio || null;
      // Get post adjustments from the image settings or fall back to flow settings
      const postAdjustments = currentImage?.settings?.postAdjustments || flow?.settings?.postAdjustments;
      setEditorImageUrl(imageUrl);
      setEditorFlowId(flowId);
      setEditorAspectRatio(aspectRatio);
      setEditorInitialAdjustments(postAdjustments);
    },
    [flows]
  );

  // Handle saving edited image
  const handleSaveEditedImage = useCallback(
    async (mode: 'overwrite' | 'new', editedImageDataUrl: string) => {
      if (!editorFlowId) {
        console.error('No flow ID for editor');
        return;
      }

      const flow = flows.find((f) => f.id === editorFlowId);
      if (!flow) {
        console.error('Flow not found:', editorFlowId);
        return;
      }

      console.log(`💾 Saving edited image (${mode}) for flow:`, editorFlowId);

      try {
        // Convert data URL to blob for upload
        const base64Match = editedImageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!base64Match) {
          throw new Error('Invalid image data URL');
        }

        const mimeType = base64Match[1];
        const base64Data = base64Match[2];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        // Generate a new image ID with extension (matching the format used by queue.ts)
        // Extension based on mime type
        const { v4: uuidv4 } = await import('uuid');
        const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
        const newImageId = `edited-${uuidv4()}.${extension}`;

        // Upload to S3
        const formData = new FormData();
        formData.append('file', blob, newImageId);
        formData.append('clientId', clientId);
        formData.append('sessionId', clientSession.id);
        formData.append('imageId', newImageId);

        const uploadResponse = await fetch('/api/upload-generated-image', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        console.log('✅ Uploaded edited image:', newImageId);

        // Update the flow with the new/replaced image
        const currentImages = [...flow.generatedImages];
        const currentGenImage = flow.generatedImages[flow.currentImageIndex];
        const imageFilename = newImageId;
        const imageId = newImageId.replace(/\.[^/.]+$/, '');

        const newImage: FlowGeneratedImage = {
          id: newImageId,
          imageId,
          imageFilename,
          timestamp: new Date().toISOString(),
          productIds: currentGenImage?.productIds || flow.productIds,
          settings: currentGenImage?.settings || flow.settings,
          prompt: currentGenImage?.prompt,
        };

        if (mode === 'overwrite') {
          // Replace the current image
          currentImages[flow.currentImageIndex] = newImage;
        } else {
          // Add as a new variant
          currentImages.push(newImage);
        }

        await updateFlowInClientSession(clientId, clientSession.id, editorFlowId, {
          generatedImages: currentImages,
          currentImageIndex: mode === 'new' ? currentImages.length - 1 : flow.currentImageIndex,
        });

        console.log(`✅ Flow updated with ${mode === 'overwrite' ? 'replaced' : 'new'} image`);
      } catch (error) {
        console.error('Failed to save edited image:', error);
      }

      setEditorImageUrl(null);
      setEditorFlowId(null);
      setEditorAspectRatio(null);
    },
    [editorFlowId, flows, clientId, clientSession.id, updateFlowInClientSession]
  );

  // Handle deleting a generated image from a flow
  const handleDeleteImage = useCallback(
    async (imageId: string, flowId: string) => {
      const flow = flows.find((f) => f.id === flowId);
      if (!flow) return;

      try {
        // Filter out the image to delete
        const updatedImages = flow.generatedImages.filter((img) => img.imageId !== imageId);

        // Calculate new currentImageIndex
        let newIndex = flow.currentImageIndex;
        if (updatedImages.length === 0) {
          newIndex = 0;
        } else if (newIndex >= updatedImages.length) {
          newIndex = updatedImages.length - 1;
        }

        await updateFlowInClientSession(clientId, clientSession.id, flowId, {
          generatedImages: updatedImages,
          currentImageIndex: newIndex,
        });

        console.log(`🗑️ Deleted image ${imageId} from flow ${flowId}`);
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    },
    [flows, clientId, clientSession.id, updateFlowInClientSession]
  );

  // Handle config drop from draggable tags
  const handleConfigDrop = useCallback(
    async (targetFlowId: string, config: DraggedConfig) => {
      try {
        // Determine which flows to update
        const isTargetSelected = selectedFlowIds.has(targetFlowId);

        // If dropped on a selected flow, apply to all selected flows
        // Otherwise, just apply to the target flow
        const flowIdsToUpdate = isTargetSelected
          ? Array.from(selectedFlowIds)
          : [targetFlowId];

        console.log(`🔄 Applying ${config.type} config to ${flowIdsToUpdate.length} flow(s)`);

        // Apply the settings to all target flows
        await Promise.all(
          flowIdsToUpdate.map((flowId) =>
            updateFlowSettings(clientId, clientSession.id, flowId, config.settings)
          )
        );

        console.log('✅ Config applied successfully');
      } catch (error) {
        console.error('Failed to apply config:', error);
      }
    },
    [clientId, clientSession.id, selectedFlowIds, updateFlowSettings]
  );

  // Handle product drop from dragging between flows or from drawer
  const handleProductDrop = useCallback(
    async (targetFlowId: string, product: DraggedProduct) => {
      const isMovingBetweenFlows = product.sourceFlowId && product.sourceFlowId !== targetFlowId;

      console.log(`📦 Moving product ${product.productId} to flow ${targetFlowId}`);

      // Optimistic UI: immediately hide the product from source flow BEFORE any async work
      if (isMovingBetweenFlows) {
        setMovingProducts((prev) => new Set(prev).add(`${product.sourceFlowId}:${product.productId}`));
      }

      try {
        // Add product to target flow with selected base image
        await addProductsToFlow(
          clientId,
          clientSession.id,
          targetFlowId,
          [product.productId],
          { [product.productId]: product.imageId }
        );

        // If dragged from another flow, remove it from source flow (background)
        if (isMovingBetweenFlows) {
          // Don't await - let it happen in background since UI already updated
          removeProductFromFlow(
            clientId,
            clientSession.id,
            product.sourceFlowId!,
            product.productId
          ).then(() => {
            console.log(`✅ Product moved from flow ${product.sourceFlowId} to ${targetFlowId}`);
          }).catch((err) => {
            console.error('Failed to remove product from source flow:', err);
          }).finally(() => {
            // Clear optimistic state once server confirms
            setMovingProducts((prev) => {
              const next = new Set(prev);
              next.delete(`${product.sourceFlowId}:${product.productId}`);
              return next;
            });
          });
        } else {
          console.log(`✅ Product added to flow ${targetFlowId}`);
        }
      } catch (error) {
        console.error('Failed to drop product:', error);
        // Revert optimistic update on error
        if (isMovingBetweenFlows) {
          setMovingProducts((prev) => {
            const next = new Set(prev);
            next.delete(`${product.sourceFlowId}:${product.productId}`);
            return next;
          });
        }
      }
    },
    [clientId, clientSession.id, addProductsToFlow, removeProductFromFlow]
  );

  // Handle changing base image for a product in a flow
  const handleChangeBaseImage = useCallback(
    async (flowId: string, productId: string, newImageId: string) => {
      const flow = flows.find((f) => f.id === flowId);
      if (!flow) return;

      console.log(`🖼️ Changing base image for product ${productId} in flow ${flowId}`);

      const updatedBaseImages = {
        ...flow.selectedBaseImages,
        [productId]: newImageId,
      };

      await updateFlowInClientSession(clientId, clientSession.id, flowId, {
        selectedBaseImages: updatedBaseImages,
      });

      console.log(`✅ Base image updated for product ${productId}`);
    },
    [clientId, clientSession.id, flows, updateFlowInClientSession]
  );

  // Handle multi-product drop from the products panel - creates a new flow for each product
  const handleMultiProductDrop = useCallback(
    async (productsData: { products: Array<{ productId: string; imageId: string }>; sourceType: string }) => {
      console.log(`📦 Creating ${productsData.products.length} new flows from panel drop`);

      for (const { productId, imageId } of productsData.products) {
        try {
          const newFlow = await addFlowToClientSession(clientId, clientSession.id);
          await addProductsToFlow(clientId, clientSession.id, newFlow.id, [productId], { [productId]: imageId });
          console.log(`✅ Created new flow with product ${productId}`);
        } catch (error) {
          console.error(`Failed to create flow for product ${productId}:`, error);
        }
      }
    },
    [clientId, clientSession.id, addFlowToClientSession, addProductsToFlow]
  );

  // Handle single product drop from panel - creates a new flow
  const handleSingleProductDropToContainer = useCallback(
    async (productData: DraggedProduct) => {
      // Only handle drops from panel (no sourceFlowId)
      if (productData.sourceFlowId) return;

      console.log(`📦 Creating new flow for product ${productData.productId}`);

      try {
        const newFlow = await addFlowToClientSession(clientId, clientSession.id);
        await addProductsToFlow(clientId, clientSession.id, newFlow.id, [productData.productId], { [productData.productId]: productData.imageId });
        console.log(`✅ Created new flow with product ${productData.productId}`);
      } catch (error) {
        console.error(`Failed to create flow for product:`, error);
      }
    },
    [clientId, clientSession.id, addFlowToClientSession, addProductsToFlow]
  );

  // Container drop handlers for products from panel
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-products') || e.dataTransfer.types.includes('application/x-product')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleContainerDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      // Try multi-product drop first
      try {
        const multiProductData = e.dataTransfer.getData('application/x-products');
        if (multiProductData) {
          const data = JSON.parse(multiProductData);
          handleMultiProductDrop(data);
          return;
        }
      } catch (err) {
        console.error('Failed to parse multi-product data:', err);
      }

      // Try single product drop (from panel only)
      try {
        const singleProductData = e.dataTransfer.getData('application/x-product');
        if (singleProductData) {
          const data: DraggedProduct = JSON.parse(singleProductData);
          handleSingleProductDropToContainer(data);
        }
      } catch (err) {
        console.error('Failed to parse single product data:', err);
      }
    },
    [handleMultiProductDrop, handleSingleProductDropToContainer]
  );

  // Get debug flow data
  const debugFlow = debugFlowId ? flows.find((f) => f.id === debugFlowId) : null;
  const debugFlowProducts = debugFlow ? products.filter((p) => debugFlow.productIds.includes(p.id)) : [];
  const debugBasePrompt = debugFlow ? buildPromptFromSettings(debugFlowProducts, debugFlow.settings) : '';
  const debugSystemPrompt = debugFlow
    ? buildSystemImageGenerationPrompt(debugBasePrompt, debugFlow.settings)
    : '';
  const debugProductImages = debugFlow
    ? debugFlowProducts.map((product) => {
      const selectedImageId = debugFlow.selectedBaseImages[product.id];
      const imageId = selectedImageId || product.productImageIds[0];
      return {
        url: imageId
          ? S3Service.getImageUrl(S3Service.S3Paths.getProductImageBasePath(clientId, product.id, imageId))
          : '',
        name: product.name,
      };
    }).filter((img) => img.url)
    : [];

  const allSelected = flows.length > 0 && selectedFlowIds.size === flows.length;

  // Handle executing all flows at once
  const handleExecuteAll = useCallback(async () => {
    // Get all flows that have products and aren't currently generating
    const executableFlows = flows.filter(
      (f) => f.productIds.length > 0 && f.status !== 'generating'
    );

    if (executableFlows.length === 0) {
      console.log('⚠️ No flows ready to execute');
      return;
    }

    console.log(`🚀 Executing all ${executableFlows.length} flows...`);

    await handleBatchExecuteFlows(executableFlows);
  }, [flows, handleBatchExecuteFlows]);

  // Handle executing selected flows from settings panel
  const handleExecuteSelectedFlows = useCallback(async () => {
    // Get selected flows that have products and aren't currently generating
    const executableFlows = selectedFlows.filter(
      (f) => f.productIds.length > 0 && f.status !== 'generating'
    );

    if (executableFlows.length === 0) {
      console.log('⚠️ No selected flows ready to execute');
      return;
    }

    console.log(`🚀 Executing ${executableFlows.length} selected flows...`);

    await handleBatchExecuteFlows(executableFlows);
  }, [selectedFlows, handleBatchExecuteFlows]);

  // Check if any selected flows are generating
  const isSelectedGenerating = selectedFlows.some((f) => f.status === 'generating');

  // Check if any flows are currently generating
  const isAnyGenerating = flows.some((f) => f.status === 'generating');
  const executableFlowsCount = flows.filter(
    (f) => f.productIds.length > 0 && f.status !== 'generating'
  ).length;

  return (
    <div className={styles.studioLayout}>
      {/* Main content area */}
      <div className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          {/* Nav panel button - mobile/tablet only */}
          {isNarrowViewport && (
            <button
              className={styles.headerNavButton}
              onClick={() => window.dispatchEvent(new CustomEvent(OPEN_NAV_DRAWER_EVENT))}
              type="button"
              title="Open navigation"
            >
              <Menu size={20} />
            </button>
          )}
          <div className={styles.headerLeft}>
            <div className={styles.titleRow}>
              {isRenaming ? (
                <>
                  <input
                    type="text"
                    className={styles.titleInput}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={handleSaveRename}
                    autoFocus
                  />
                  <button
                    className={styles.titleButton}
                    onClick={handleSaveRename}
                    type="button"
                    title="Save"
                  >
                    <Check style={{ width: 16, height: 16 }} />
                  </button>
                  <button
                    className={styles.titleButton}
                    onClick={handleCancelRename}
                    type="button"
                    title="Cancel"
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </>
              ) : (
                <>
                  <h1 className={styles.title}>{clientSession.name}</h1>
                  <button
                    className={styles.titleButton}
                    onClick={handleStartRename}
                    type="button"
                    title="Rename"
                  >
                    <Pencil style={{ width: 16, height: 16 }} />
                  </button>
                </>
              )}
            </div>
            <p className={styles.subtitle}>
              {flows.length} flow{flows.length !== 1 ? 's' : ''}
              {selectedFlowIds.size > 1 && ` • ${selectedFlowIds.size} selected`}
            </p>
          </div>
          <div className={styles.headerActions}>
            {flows.length > 0 && (
              <div className={styles.headerRight}>
                <button
                  className={styles.iconButton}
                  title={allSelected ? "Deselect all" : "Select all"}
                  type="button"
                  onClick={handleSelectAll}
                >
                  {allSelected ? <CheckSquare style={{ width: 20, height: 20 }} /> : <Square style={{ width: 20, height: 20 }} />}
                </button>
                <p className={styles.subtitle}>
                  {allSelected ? "Deselect all" : "Select all"}
                </p>
              </div>
            )}
            {/* Settings panel button - mobile/tablet only, in header */}
            {isNarrowViewport && (
              <button
                className={styles.headerSettingsButton}
                onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
                type="button"
                title={settingsPanelOpen ? 'Close settings' : 'Open settings'}
              >
                <Settings size={20} />
              </button>
            )}
          </div>
        </header>

        {/* Flows Container */}
        <div
          className={styles.flowsContainer}
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
        >
          {flows.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Layers />
              </div>
              <h2 className={styles.emptyTitle}>No flows yet</h2>
              <p className={styles.emptyText}>
                Create your first flow to start generating product visualizations. Each flow can contain multiple products and unique settings.
              </p>
              <button className={styles.addFlowButton} onClick={handleAddFlow} type="button" style={{ marginTop: 16 }}>
                <Plus />
                <span>Create First Flow</span>
              </button>
            </div>
          ) : (
            <>
              {flows.map((flow) => {
                // Get products being moved out of this flow (for optimistic UI)
                const hiddenProductIds = new Set<string>();
                movingProducts.forEach((key) => {
                  const [flowId, productId] = key.split(':');
                  if (flowId === flow.id) {
                    hiddenProductIds.add(productId);
                  }
                });

                return (
                  <FlowCard
                    key={flow.id}
                    flow={flow}
                    clientId={clientId}
                    sessionId={clientSession.id}
                    products={products}
                    hiddenProductIds={hiddenProductIds.size > 0 ? hiddenProductIds : undefined}
                    isSelected={selectedFlowIds.has(flow.id)}
                    onSelect={(e) => handleFlowSelect(flow.id, e)}
                    onRemoveProduct={(productId) => handleRemoveProduct(flow.id, productId)}
                    onExecute={() => handleExecuteFlow(flow.id)}
                    onDelete={() => handleDeleteFlow(flow.id)}
                    onDebug={() => setDebugFlowId(flow.id)}
                    onSettingsClick={() => setSelectedFlowIds(new Set([flow.id]))}
                    onHistorySelect={(index) => handleHistorySelect(flow.id, index)}
                    onImageClick={onImageClick}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={checkIsFavorite}
                    onToggleScene={handleToggleScene}
                    isScene={checkIsScene}
                    onConfigDrop={(config) => handleConfigDrop(flow.id, config)}
                    onProductDrop={(product) => handleProductDrop(flow.id, product)}
                    onEditImage={handleEditImage}
                    onDeleteImage={handleDeleteImage}
                    onChangeBaseImage={handleChangeBaseImage}
                  />
                );
              })}
              <button className={styles.addFlowButton} onClick={handleAddFlow} type="button">
                <Plus />
                <span>Add Flow</span>
              </button>
            </>
          )}
        </div>

        {/* Flow Assistant */}
        <FlowAssistant
          isOpen={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          selectedFlow={selectedFlow || null}
          flows={flows}
          products={products}
          onUpdateSettings={handleUpdateSettings}
          onRemoveProduct={(productId) => {
            if (selectedFlowId) {
              handleRemoveProduct(selectedFlowId, productId);
            }
          }}
          onExecute={() => {
            if (selectedFlowId) {
              handleExecuteFlow(selectedFlowId);
            }
          }}
          onCreateFlow={handleAddFlow}
          onSelectFlow={(flowId) => setSelectedFlowIds(new Set([flowId]))}
        />

        {/* Assistant FAB */}
        <button
          className={styles.assistantFab}
          onClick={() => setAssistantOpen(true)}
          type="button"
          title="Open Flow Assistant"
        >
          <MessageCircle style={{ width: 24, height: 24 }} />
        </button>

        {/* Global Execute Button */}
        {flows.length > 0 && (
          <button
            className={styles.globalExecuteButton}
            onClick={handleExecuteAll}
            disabled={executableFlowsCount === 0 || isAnyGenerating}
            type="button"
            title={isAnyGenerating ? 'Generation in progress...' : `Execute all ${executableFlowsCount} flows`}
          >
            {isAnyGenerating ? (
              <>
                <Loader2 className={styles.spinner} style={{ width: 20, height: 20 }} />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Play style={{ width: 20, height: 20 }} />
                <span>Execute All ({executableFlowsCount})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Settings Panel Overlay (for narrow viewport) */}
      {isNarrowViewport && (
        <div
          className={`${styles.settingsPanelOverlay} ${settingsPanelOpen ? styles.visible : ''}`}
          onClick={() => setSettingsPanelOpen(false)}
        />
      )}

      {/* Persistent Settings Panel */}
      <FlowSettingsPanel
        selectedFlows={selectedFlows}
        onUpdateSettings={handleUpdateSettings}
        onUpdateSharedPrompt={handleUpdateSharedPrompt}
        onOpenSceneLibrary={() => setSceneLibraryOpen(true)}
        onExecuteFlows={handleExecuteSelectedFlows}
        isExecuting={isSelectedGenerating}
        className={isNarrowViewport && settingsPanelOpen ? styles.settingsPanelOpen : undefined}
      />

      {/* Scene Library Modal */}
      <SceneLibraryModal
        isOpen={sceneLibraryOpen}
        onClose={() => setSceneLibraryOpen(false)}
        onSelectScene={handleSelectScene}
        currentSceneUrl={selectedFlow?.settings.sceneImageUrl}
        clientId={clientId}
        products={products}
        uploadedScenes={uploadedScenes}
        onUploadScene={handleUploadScene}
        onDeleteUploadedScene={handleDeleteUploadedScene}
        onToggleFavorite={handleToggleFavorite}
        onToggleScene={handleToggleScene}
      />



      {/* Debug Prompt Modal */}
      <DebugPromptModal
        isOpen={debugFlowId !== null}
        onClose={() => setDebugFlowId(null)}
        systemPrompt={debugSystemPrompt}
        customPrompt={debugFlow?.settings.customPrompt}
        onSaveCustomPrompt={(prompt) => {
          if (debugFlowId) {
            handleSaveCustomPrompt(debugFlowId, prompt);
          }
        }}
        onRestoreSystemPrompt={() => {
          if (debugFlowId) {
            handleRestoreSystemPrompt(debugFlowId);
          }
        }}
        productImages={debugProductImages}
        sceneImageUrl={debugFlow?.settings.sceneImageUrl}
      />

      {/* Image Editor Modal */}
      <ImageEditorModal
        isOpen={editorImageUrl !== null}
        onClose={() => {
          setEditorImageUrl(null);
          setEditorFlowId(null);
          setEditorAspectRatio(null);
          setEditorInitialAdjustments(undefined);
        }}
        imageUrl={editorImageUrl || ''}
        aspectRatio={editorAspectRatio ?? undefined}
        onSave={handleSaveEditedImage}
        clientId={clientId}
        sessionId={clientSession.id}
        modelOverrides={modelOverrides}
        initialAdjustments={editorInitialAdjustments}
      />
    </div>
  );
}
