'use client';

import { useData } from '@/lib/contexts/DataContext';
import { apiClient } from '@/lib/api-client';
import * as S3Service from '@/lib/services/s3/browser';
import type { ClientSession, ImageMessagePart, Message, Product, PromptSettings, Session } from '@/lib/types/app-types';
import { cloneDefaultPromptSettings, normalizePromptSettings } from '@/lib/types/app-types';
import clsx from 'clsx';
import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { buildTestId } from '@/lib/utils/test-ids';
import { useBaseImageSelection, useImageGeneration, useMultiSelect } from './hooks';
import { ImageModal } from '../modals';
import { PromptBuilder } from '../PromptBuilder';
import { MessageBubble } from './MessageBubble/MessageBubble';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import scssStyles from './ChatView.module.scss';
import { EmptyState } from './EmptyState';

interface ChatViewProps {
  clientId: string;
  productId?: string;
  sessionId?: string;
  product?: Product;
  session?: Session;
  clientSession?: ClientSession;
  sessionProducts?: Product[];
  onImageClick: (imageUrl: string) => void;
}

export function ChatView({
  clientId,
  productId,
  sessionId,
  product,
  session,
  clientSession,
  sessionProducts,
  onImageClick,
}: ChatViewProps) {
  const {
    addMessageToSession,
    updateMessageInSession,
    addMessageToClientSession,
    updateMessageInClientSession,
    updateClientSession,
    updateSession,
    toggleFavoriteGeneratedImage,
    getClient,
  } = useData();

  // Get client's AI model configuration for generation
  const client = getClient(clientId);
  const modelOverrides = client?.aiModelConfig
    ? {
        imageModel: client.aiModelConfig.imageModel,
        fallbackImageModel: client.aiModelConfig.fallbackImageModel,
      }
    : undefined;

  // Determine mode
  const isClientSession = !!clientSession;
  const effectiveSession = isClientSession ? clientSession : session;
  const effectiveSessionId = isClientSession ? clientSession!.id : sessionId!;

  // State
  const [promptSettings, setPromptSettings] = useState<PromptSettings>(() => cloneDefaultPromptSettings());
  const [inputText, setInputText] = useState('');
  const [inspirationImage, setInspirationImage] = useState<File | null>(null);
  const [inspirationPreview, setInspirationPreview] = useState<string | null>(null);
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false);
  const [productImageModalUrl, setProductImageModalUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to call correct update function
  const updateMessage = async (messageId: string, updates: Partial<Message>) => {
    if (isClientSession) {
      await updateMessageInClientSession(clientId, effectiveSessionId, messageId, updates);
    } else {
      await updateMessageInSession(clientId, productId!, sessionId!, messageId, updates);
    }
  };

  // Custom hooks
  const imageGeneration = useImageGeneration(updateMessage);
  const baseImageSelection = useBaseImageSelection(
    product,
    session,
    clientSession,
    sessionProducts,
    isClientSession,
    updateSession,
    updateClientSession,
    clientId
  );
  const multiSelect = useMultiSelect();

  // Update session ref for polling
  useEffect(() => {
    imageGeneration.sessionRef.current = effectiveSession;
  }, [effectiveSession]);

  // Force numberOfVariants to 1 in client session mode
  useEffect(() => {
    if (isClientSession && promptSettings.numberOfVariants !== 1) {
      setPromptSettings((prev) => ({ ...prev, numberOfVariants: 1 }));
    }
  }, [isClientSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [effectiveSession?.messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => imageGeneration.cleanup();
  }, [imageGeneration]);

  // Start polling for in-progress jobs on mount (only once when session loads)
  useEffect(() => {
    if (!effectiveSession?.messages) return;

    console.log('🔍 Checking for in-progress jobs to resume polling...');
    const polledJobs = new Set<string>();

    for (const message of effectiveSession.messages) {
      if (message.role !== 'assistant') continue;
      for (const part of message.parts) {
        if (part.type !== 'image') continue;
        const imagePart = part as ImageMessagePart;
        if ((imagePart.status === 'pending' || imagePart.status === 'generating') && imagePart.jobId) {
          // Only start polling if not already polling this job
          if (!polledJobs.has(imagePart.jobId)) {
            console.log(`🔄 Resuming polling for job ${imagePart.jobId} (status: ${imagePart.status})`);
            imageGeneration.startPolling(imagePart.jobId, message.id, imagePart.metadata?.prompt || '', imagePart.status);
            polledJobs.add(imagePart.jobId);
          }
        }
      }
    }
  }, [effectiveSession?.id, imageGeneration]); // Only depend on session ID, not messages

  // Visibility change handler for polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      imageGeneration.setPageVisible(visible);

      if (visible && effectiveSession?.messages) {
        for (const message of effectiveSession.messages) {
          if (message.role !== 'assistant') continue;
          for (const part of message.parts) {
            if (part.type !== 'image') continue;
            const imagePart = part as ImageMessagePart;
            if ((imagePart.status === 'pending' || imagePart.status === 'generating') && imagePart.jobId) {
              imageGeneration.startPolling(imagePart.jobId, message.id, imagePart.metadata?.prompt || '', imagePart.status);
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [effectiveSession?.messages, imageGeneration]);

  // Handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInspirationImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInspirationPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeInspirationImage = () => {
    setInspirationImage(null);
    setInspirationPreview(null);
    // Reset file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSettingTag = (key: keyof PromptSettings) => {
    setPromptSettings((prev) => {
      const updated = { ...prev };
      if (key === 'scene') {
        updated.scene = '';
        updated.customScene = '';
      } else if (key === 'style') {
        updated.style = '';
        updated.customStyle = '';
      } else if (key === 'lighting') {
        updated.lighting = '';
        updated.customLighting = '';
      } else if (key === 'surroundings') {
        updated.surroundings = '';
        updated.customSurroundings = '';
      } else if (key === 'aspectRatio') {
        updated.aspectRatio = '';
      }
      return updated;
    });
  };

  const buildPromptText = (): string => {
    const parts = [];
    const scene = promptSettings.scene === 'Custom' ? promptSettings.customScene : promptSettings.scene;
    const style = promptSettings.style === 'Custom' ? promptSettings.customStyle : promptSettings.style;
    const lighting = promptSettings.lighting === 'Custom' ? promptSettings.customLighting : promptSettings.lighting;
    const surroundings = promptSettings.surroundings === 'Custom' ? promptSettings.customSurroundings : promptSettings.surroundings;

    if (scene) parts.push(`Scene: ${scene}`);
    if (style) parts.push(`Style: ${style}`);
    if (lighting) parts.push(`Lighting: ${lighting}`);
    if (surroundings) parts.push(`Surroundings: ${surroundings}`);
    if (promptSettings.aspectRatio) parts.push(`Aspect Ratio: ${promptSettings.aspectRatio}`);
    if (inputText.trim()) parts.push(`\nAdditional instructions: ${inputText.trim()}`);

    return parts.join('\n');
  };

  const handleSend = async () => {
    if (imageGeneration.isGenerating) return;

    const promptText = buildPromptText();
    if (!promptText.trim() && !inspirationImage) {
      alert('Please provide some instructions or settings.');
      return;
    }

    imageGeneration.setIsGenerating(true);

    try {
      // Upload inspiration image to S3 if provided
      let inspirationImageId: string | undefined;
      if (inspirationImage) {
        try {
          console.log('📤 Uploading inspiration image to S3...');
          inspirationImageId = uuidv4();
          const extension = inspirationImage.name.split('.').pop() || 'jpg';
          const imageIdWithExtension = `${inspirationImageId}.${extension}`;

          await apiClient.uploadInspirationImage(
            clientId,
            sessionId!,
            imageIdWithExtension,
            inspirationImage,
            isClientSession ? undefined : productId
          );

          console.log(`✅ Inspiration image uploaded: ${imageIdWithExtension}`);
          inspirationImageId = imageIdWithExtension;
        } catch (error) {
          console.error('Failed to upload inspiration image:', error);
          alert('Failed to upload inspiration image. Continuing without it...');
          inspirationImageId = undefined;
        }
      }

      if (isClientSession) {
        // Multi-product client session generation
        const userMessage: Message = {
          id: uuidv4(),
          role: 'user',
          parts: [{ type: 'text', content: promptText }],
          timestamp: new Date().toISOString(),
          baseImageIds: baseImageSelection.selectedBaseImages,
          inspirationImageId: inspirationImageId || undefined,
        };

        // Create batch requests for all products in the client session
        const clientSessionData = effectiveSession as ClientSession;
        const requests = clientSessionData.productIds.map((prodId) => ({
          clientId,
          productId: prodId,
          sessionId: sessionId!,
          prompt: promptText,
          settings: promptSettings,
          productImageId: baseImageSelection.selectedBaseImages[prodId],
          inspirationImageId: inspirationImageId,
          isClientSession: true,
        }));

        const response = await fetch('/api/batch-generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests,
            batchConfig: {
              batchSize: 3,
              delayBetweenBatches: 2000,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to start batch generation');
        }

        const data = await response.json();

        // Create separate assistant message for each product
        const assistantMessages: Message[] = data.results
          .filter((result: any) => result.success)
          .map((result: any) => {
            const product = sessionProducts?.find((p: Product) => p.id === result.productId);
            return {
              id: uuidv4(),
              role: 'assistant' as const,
              parts: [
                {
                  type: 'image' as const,
                  imageIds: result.expectedImageIds || [],
                  jobId: result.jobId,
                  status: 'pending' as const,
                  progress: 0,
                  productId: result.productId,
                  metadata: {
                    prompt: promptText,
                    settings: promptSettings,
                    productName: product?.name || 'Unknown Product',
                  },
                },
              ],
              timestamp: new Date().toISOString(),
            };
          }); // Save user message and all assistant messages
        await addMessageToClientSession(clientId, sessionId!, [userMessage, ...assistantMessages]);
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Start polling for all jobs
        assistantMessages.forEach((msg) => {
          const imagePart = msg.parts[0] as ImageMessagePart;
          if (imagePart.jobId) {
            imageGeneration.startPolling(imagePart.jobId, msg.id, promptText);
          }
        });
      } else {
        // Single product generation
        const userMessage: Message = {
          id: uuidv4(),
          role: 'user',
          parts: [{ type: 'text', content: promptText }],
          timestamp: new Date().toISOString(),
          baseImageId: baseImageSelection.selectedProductImageId || undefined,
          inspirationImageId: inspirationImageId || undefined,
        };

        const response = await fetch('/api/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            productId,
            sessionId,
            prompt: promptText,
            settings: promptSettings,
            productImageId: baseImageSelection.selectedProductImageId,
            inspirationImageId: inspirationImageId,
            modelOverrides,
          }),
        });

        if (!response.ok) throw new Error('Failed to start generation');

        const data = await response.json();
        const assistantMessageId = uuidv4();
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          parts: [
            {
              type: 'image',
              imageIds: data.expectedImageIds || [],
              jobId: data.jobId,
              status: 'pending',
              progress: 0,
              metadata: { prompt: promptText, settings: promptSettings },
            },
          ],
          timestamp: new Date().toISOString(),
        };

        await addMessageToSession(clientId, productId!, sessionId!, [userMessage, assistantMessage]);
        await new Promise((resolve) => setTimeout(resolve, 100));
        imageGeneration.startPolling(data.jobId, assistantMessageId, promptText);
      }

      setInputText('');
      removeInspirationImage();
    } catch (error) {
      console.error('Failed to start generation:', error);
      alert('Failed to start image generation. Please try again.');
      imageGeneration.setIsGenerating(false);
    }
  };

  const handleSelectAllImages = () => {
    const allImageIds: string[] = [];
    effectiveSession?.messages.forEach((message) => {
      message.parts.forEach((part) => {
        if (part.type === 'image') {
          const imagePart = part as ImageMessagePart;
          imagePart.imageIds.forEach((imageId) => allImageIds.push(imageId));
        }
      });
    });
    multiSelect.handleSelectAllImages(allImageIds);
  };

  const handleApplyMultiSelect = async () => {
    if (multiSelect.selectedImages.size === 0) {
      alert('No images selected');
      return;
    }

    try {
      if (multiSelect.multiSelectAction === 'favorite') {
        for (const imageId of multiSelect.selectedImages) {
          const message = effectiveSession?.messages.find((m) => {
            return m.parts.some((p) => p.type === 'image' && (p as ImageMessagePart).imageIds.includes(imageId));
          });

          if (message) {
            const imagePart = message.parts.find((p) => p.type === 'image' && (p as ImageMessagePart).imageIds.includes(imageId)) as
              | ImageMessagePart
              | undefined;
            const targetProductId = isClientSession ? imagePart?.productId : productId;

            if (targetProductId) {
              await toggleFavoriteGeneratedImage(clientId, targetProductId, imageId, effectiveSessionId);
            }
          }
        }
        alert(`${multiSelect.selectedImages.size} image(s) favorited!`);
      } else if (multiSelect.multiSelectAction === 'download') {
        for (const imageId of multiSelect.selectedImages) {
          const message = effectiveSession?.messages.find((m) => {
            return m.parts.some((p) => p.type === 'image' && (p as ImageMessagePart).imageIds.includes(imageId));
          });

          if (message) {
            const imagePart = message.parts.find((p) => p.type === 'image' && (p as ImageMessagePart).imageIds.includes(imageId)) as
              | ImageMessagePart
              | undefined;
            const targetProductId = isClientSession ? imagePart?.productId : productId;

            if (targetProductId) {
              const imageUrl = isClientSession
                ? S3Service.getImageUrl(S3Service.S3Paths.getClientSessionMediaFilePath(clientId, effectiveSessionId, imageId))
                : S3Service.getImageUrl(S3Service.S3Paths.getMediaFilePath(clientId, targetProductId, effectiveSessionId, imageId));

              const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
              const response = await fetch(proxyUrl);
              if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = imageId;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              }
            }
          }
        }
        alert(`${multiSelect.selectedImages.size} image(s) downloaded!`);
      }

      multiSelect.handleCancelMultiSelect();
    } catch (error) {
      console.error('Failed to apply multi-select action:', error);
      alert('Failed to complete action. Please try again.');
    }
  };

  const handleRetryGeneration = async (message: Message, part: ImageMessagePart) => {
    if (imageGeneration.isGenerating) return;

    await updateMessage(message.id, {
      parts: message.parts.map((p) => (p === part ? { ...p, status: 'pending' as const, progress: 0, error: undefined } : p)),
    });

    const promptText = part.metadata?.prompt || '';
    const settings = normalizePromptSettings(part.metadata?.settings);

    imageGeneration.setIsGenerating(true);

    try {
      const targetProductId = isClientSession ? part.productId : productId;
      const targetSessionId = isClientSession ? effectiveSessionId : sessionId;

      if (!targetProductId || !targetSessionId) {
        throw new Error('Missing required IDs for retry');
      }

      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          productId: targetProductId,
          sessionId: targetSessionId,
          prompt: promptText,
          settings,
          productImageId: isClientSession
            ? message.baseImageIds?.[targetProductId] || baseImageSelection.selectedBaseImages[targetProductId]
            : message.baseImageId || baseImageSelection.selectedProductImageId,
          isClientSession,
          modelOverrides,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start generation: ${response.statusText}`);
      }

      const data = await response.json();
      await updateMessage(message.id, {
        parts: message.parts.map((p) =>
          p === part ? { ...p, jobId: data.jobId, imageIds: data.expectedImageIds, status: 'pending' as const } : p
        ),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      imageGeneration.startPolling(data.jobId, message.id, promptText);
    } catch (error) {
      console.error('Failed to retry generation:', error);
      alert('Failed to retry image generation. Please try again.');
      imageGeneration.setIsGenerating(false);
    }
  };

  const productInfo = isClientSession
    ? `${sessionProducts?.length || 0} product${(sessionProducts?.length || 0) !== 1 ? 's' : ''}`
    : product?.name || '';

  return (
    <>
      <div className={scssStyles.container}>
        <div className={scssStyles.chatColumn}>
          <ChatHeader
            sessionName={effectiveSession?.name}
            productInfo={productInfo}
            isMultiSelectMode={multiSelect.isMultiSelectMode}
            selectedImagesCount={multiSelect.selectedImages.size}
            onStartMultiSelect={multiSelect.handleStartMultiSelect}
            onCancelMultiSelect={multiSelect.handleCancelMultiSelect}
            onApplyMultiSelect={handleApplyMultiSelect}
            onSelectAll={handleSelectAllImages}
            onOpenPromptBuilder={() => setIsPromptBuilderOpen(true)}
          />

          {/* Messages */}
          <div className={scssStyles.messagesContainer}>
            {effectiveSession?.messages.length === 0 ? (
              <EmptyState />
            ) : (
              effectiveSession?.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  clientId={clientId}
                  productId={productId}
                  sessionId={effectiveSessionId}
                  product={product}
                  isClientSession={isClientSession}
                  sessionProducts={sessionProducts}
                  onImageClick={onImageClick}
                  onRetryGeneration={handleRetryGeneration}
                  isMultiSelectMode={multiSelect.isMultiSelectMode}
                  selectedImages={multiSelect.selectedImages}
                  onImageSelection={multiSelect.handleToggleImageSelection}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            inputText={inputText}
            onInputChange={setInputText}
            onSend={handleSend}
            isGenerating={imageGeneration.isGenerating}
            promptSettings={promptSettings}
            onRemoveSettingTag={removeSettingTag}
            inspirationPreview={inspirationPreview}
            onRemoveInspiration={removeInspirationImage}
            onImageSelect={handleImageSelect}
            fileInputRef={fileInputRef}
          />
        </div>
      </div>

      {/* Prompt Builder Drawer */}
      {isPromptBuilderOpen && (
        <div
          className={scssStyles.drawerOverlay}
          onClick={() => setIsPromptBuilderOpen(false)}
          data-testid={buildTestId('chat-view', 'prompt-builder-overlay')}
        />
      )}
      <div className={clsx(scssStyles.drawer, { [scssStyles.open]: isPromptBuilderOpen })}>
        <div className={scssStyles.drawerHeader}>
          <h2 className={scssStyles.drawerTitle}>Prompt Builder</h2>
          <button
            onClick={() => setIsPromptBuilderOpen(false)}
            className={scssStyles.iconButton}
            aria-label="Close prompt builder"
            data-testid={buildTestId('chat-view', 'prompt-builder-close')}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
        <div className={scssStyles.drawerContent}>
          <PromptBuilder
            settings={promptSettings}
            onChange={setPromptSettings}
            {...(!isClientSession && {
              product: product,
              selectedImageId: baseImageSelection.selectedProductImageId,
              onSelectedImageIdChange: (imageId: string) =>
                baseImageSelection.handleSelectedProductImageChange(imageId, productId, sessionId),
            })}
            {...(isClientSession && {
              products: sessionProducts,
              selectedBaseImages: baseImageSelection.selectedBaseImages,
              onSelectedBaseImagesChange: baseImageSelection.handleSelectedBaseImagesChange,
            })}
            showHeader={false}
            onImageClick={(imageUrl: string) => setProductImageModalUrl(imageUrl)}
            isClientSession={isClientSession}
          />
        </div>
      </div>

      {/* Product Image Modal */}
      <ImageModal isOpen={productImageModalUrl !== null} imageUrl={productImageModalUrl} onClose={() => setProductImageModalUrl(null)} />
    </>
  );
}
