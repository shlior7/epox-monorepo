import { useCallback, useState } from 'react';
import type { BaseImage, Revision } from './types';

interface UseFlowCardStateOptions {
  revisions: Revision[];
  baseImages: BaseImage[];
  selectedBaseImageId: string;
  status: string;
  productName: string;
  onDeleteRevision?: (revisionId: string) => void;
  onImageEdited?: (
    revisionId: string,
    result: {
      mode: 'overwrite' | 'copy';
      imageDataUrl: string;
      imageUrl?: string;
      assetId?: string;
    }
  ) => void;
}

export function useFlowCardState({
  revisions,
  baseImages,
  selectedBaseImageId,
  status,
  productName,
  onDeleteRevision,
  onImageEdited,
}: UseFlowCardStateOptions) {
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(0);
  const [showBaseImageModal, setShowBaseImageModal] = useState(false);
  const [showSceneTypeModal, setShowSceneTypeModal] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRevisionId, setEditingRevisionId] = useState<string | null>(null);
  const [showCustomSceneInput, setShowCustomSceneInput] = useState(false);
  const [customSceneType, setCustomSceneType] = useState('');
  const [deleteConfirmRevisionId, setDeleteConfirmRevisionId] = useState<string | null>(null);

  const handleOpenEditor = useCallback((revisionId: string) => {
    setEditingRevisionId(revisionId);
    setEditorOpen(true);
  }, []);

  const handleImageSave = useCallback(
    (result: {
      mode: 'overwrite' | 'copy';
      imageDataUrl: string;
      imageUrl?: string;
      assetId?: string;
    }) => {
      if (editingRevisionId && onImageEdited) {
        onImageEdited(editingRevisionId, result);
      }
    },
    [editingRevisionId, onImageEdited]
  );

  const handleDownload = useCallback(
    (imageUrl: string) => {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-revision.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [productName]
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmRevisionId && onDeleteRevision) {
      onDeleteRevision(deleteConfirmRevisionId);
      if (currentRevisionIndex > 0) {
        setCurrentRevisionIndex((i) => i - 1);
      }
    }
    setDeleteConfirmRevisionId(null);
  }, [deleteConfirmRevisionId, onDeleteRevision, currentRevisionIndex]);

  const editingRevision = editingRevisionId
    ? revisions.find((r) => r.id === editingRevisionId)
    : null;

  const selectedBaseImage =
    baseImages.find((img) => img.id === selectedBaseImageId) || baseImages[0];
  const currentRevision = revisions[currentRevisionIndex];

  const canNavigatePrev = currentRevisionIndex > 0;
  const canNavigateNext = currentRevisionIndex < revisions.length - 1;

  const isGenerating = status === 'generating';
  const hasRevisions = revisions.length > 0;

  return {
    // State
    currentRevisionIndex,
    setCurrentRevisionIndex,
    showBaseImageModal,
    setShowBaseImageModal,
    showSceneTypeModal,
    setShowSceneTypeModal,
    fullscreenImage,
    setFullscreenImage,
    editorOpen,
    setEditorOpen,
    editingRevisionId,
    setEditingRevisionId,
    showCustomSceneInput,
    setShowCustomSceneInput,
    customSceneType,
    setCustomSceneType,
    deleteConfirmRevisionId,
    setDeleteConfirmRevisionId,

    // Handlers
    handleOpenEditor,
    handleImageSave,
    handleDownload,
    handleConfirmDelete,

    // Derived
    editingRevision,
    selectedBaseImage,
    currentRevision,
    canNavigatePrev,
    canNavigateNext,
    isGenerating,
    hasRevisions,
  };
}
