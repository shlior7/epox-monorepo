'use client';

import React from 'react';
import { X, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Portal } from '../common/Portal';
import { Z_INDEX } from '@/lib/styles/common-styles';
import styles from './SceneStudioView.module.scss';

interface DebugPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  customPrompt?: string;
  onSaveCustomPrompt: (prompt: string) => void;
  onRestoreSystemPrompt: () => void;
  productImages: Array<{ url: string; name: string }>;
  sceneImageUrl?: string;
}

export function DebugPromptModal({
  isOpen,
  onClose,
  systemPrompt,
  customPrompt,
  onSaveCustomPrompt,
  onRestoreSystemPrompt,
  productImages,
  sceneImageUrl,
}: DebugPromptModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [draftPrompt, setDraftPrompt] = React.useState('');

  const effectivePrompt = customPrompt?.trim() || systemPrompt;
  const isCustomPrompt = Boolean(customPrompt?.trim());
  const hasChanges = draftPrompt.trim() !== effectivePrompt.trim();
  const canSave = draftPrompt.trim().length > 0 && (hasChanges || !isCustomPrompt);

  React.useEffect(() => {
    if (isOpen) {
      setDraftPrompt(effectivePrompt);
    }
  }, [effectivePrompt, isOpen]);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(draftPrompt || effectivePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSaveCustomPrompt = () => {
    const trimmed = draftPrompt.trim();
    if (!trimmed) return;
    onSaveCustomPrompt(trimmed);
  };

  const handleRestorePrompt = () => {
    onRestoreSystemPrompt();
    setDraftPrompt(systemPrompt);
  };

  return (
    <Portal>
      <div
        className={styles.debugModalOverlay}
        onClick={handleOverlayClick}
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        <div className={styles.debugModal}>
          <div className={styles.debugModalHeader}>
            <h2 className={styles.debugModalTitle}>Debug: LLM Input Preview</h2>
            <button
              onClick={onClose}
              className={styles.iconButton}
              type="button"
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>

          <div className={styles.debugModalContent}>
            {/* Images Section */}
            <div className={styles.debugSection}>
              <h3 className={styles.debugSectionTitle}>
                <ImageIcon style={{ width: 16, height: 16 }} />
                Images Sent to LLM
              </h3>

              <div className={styles.debugImagesGrid}>
                {/* Scene/Backdrop Image */}
                {sceneImageUrl && (
                  <div className={styles.debugImageItem}>
                    <div className={styles.debugImageLabel}>Scene Backdrop</div>
                    <div className={styles.debugImageContainer}>
                      <img src={sceneImageUrl} alt="Scene backdrop" />
                    </div>
                  </div>
                )}

                {/* Product Images */}
                {productImages.map((img, index) => (
                  <div key={index} className={styles.debugImageItem}>
                    <div className={styles.debugImageLabel}>{img.name}</div>
                    <div className={styles.debugImageContainer}>
                      <img src={img.url} alt={img.name} />
                    </div>
                  </div>
                ))}

                {productImages.length === 0 && !sceneImageUrl && (
                  <div className={styles.debugNoImages}>
                    <ImageIcon style={{ width: 32, height: 32 }} />
                    <span>No images configured</span>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Section */}
            <div className={styles.debugSection}>
              <div className={styles.debugSectionHeader}>
                <div className={styles.debugPromptHeader}>
                  <h3 className={styles.debugSectionTitle}>Final Prompt</h3>
                  {isCustomPrompt && (
                    <span className={styles.customPromptBadge}>Custom prompt active</span>
                  )}
                </div>
                <div className={styles.debugPromptActions}>
                  <button
                    onClick={handleCopyPrompt}
                    className={styles.copyButton}
                    type="button"
                  >
                    {copied ? (
                      <>
                        <Check style={{ width: 14, height: 14 }} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy style={{ width: 14, height: 14 }} />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSaveCustomPrompt}
                    className={styles.debugActionButton}
                    type="button"
                    disabled={!canSave}
                  >
                    Save custom prompt
                  </button>
                  <button
                    onClick={handleRestorePrompt}
                    className={styles.debugActionButtonSecondary}
                    type="button"
                    disabled={!isCustomPrompt}
                  >
                    Restore system prompt
                  </button>
                </div>
              </div>
              <textarea
                className={styles.debugPromptEditor}
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                rows={12}
              />
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
