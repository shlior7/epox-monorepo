'use client';

import React, { useMemo } from 'react';
import { ChevronDown, Image, Wand2 } from 'lucide-react';
import { AVAILABLE_IMAGE_MODELS, type ModelTask } from 'visualizer-ai/client';
import styles from './ModelSelector.module.scss';

export interface ModelSelectorContext {
  /** Whether the user has added reference images */
  hasReferenceImages?: boolean;
  /** Number of reference images (some models have limits) */
  referenceImageCount?: number;
  /** Whether this is for editing an existing image */
  isEditing?: boolean;
  /** The task type being performed */
  task?: ModelTask;
}

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  label?: string;
  showDescription?: boolean;
  /** Context for smart filtering - models that don't support required features will be hidden */
  context?: ModelSelectorContext;
  /** Show upgrade recommendation if available */
  showUpgradeHint?: boolean;
  /** Callback when user clicks upgrade recommendation */
  onUpgradeClick?: (modelId: string) => void;
}

export function ModelSelector({
  selectedModelId,
  onModelChange,
  disabled = false,
  label = 'AI Model',
  showDescription = true,
  context,
}: ModelSelectorProps) {
  // Filter models based on context requirements
  const availableModels = useMemo(() => {
    let models = [...AVAILABLE_IMAGE_MODELS];

    if (context) {
      // Filter by reference image support
      if (context.hasReferenceImages) {
        models = models.filter((m) => m.capabilities.supportsReferenceImages);

        // Further filter by reference count limit
        if (context.referenceImageCount) {
          models = models.filter(
            (m) => !m.capabilities.maxReferenceImages || m.capabilities.maxReferenceImages >= context.referenceImageCount!
          );
        }
      }

      // Filter by editing support
      if (context.isEditing) {
        models = models.filter((m) => m.capabilities.supportsEditing);
      }

      // Filter by task type
      if (context.task) {
        models = models.filter((m) => m.recommendedFor.includes(context.task!));
      }
    }

    return models;
  }, [context]);

  const selectedModel =
    availableModels.find((m) => m.id === selectedModelId) ||
    AVAILABLE_IMAGE_MODELS.find((m) => m.id === selectedModelId) ||
    availableModels[0];

  // Check if selected model is not in filtered list (user override scenario)
  const isModelOverridden = selectedModel && !availableModels.find((m) => m.id === selectedModel.id);

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.selectWrapper}>
        <select
          value={selectedModelId}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className={styles.select}
          aria-label={label}
        >
          {/* Show filtered models first */}
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} - ${model.costPerImage.toFixed(3)}
            </option>
          ))}
          {/* If selected model is not in filtered list, show it separately */}
          {isModelOverridden && selectedModel && (
            <option key={selectedModel.id} value={selectedModel.id} disabled>
              {selectedModel.name} (not recommended)
            </option>
          )}
        </select>
        <ChevronDown size={16} className={styles.chevron} />
      </div>

      {showDescription && selectedModel && (
        <div className={styles.modelInfo}>
          {/* Model description */}
          <p className={styles.modelDescription}>{selectedModel.description}</p>

          {/* Capability indicators */}
          <div className={styles.capabilities}>
            {selectedModel.capabilities.supportsReferenceImages && (
              <span className={styles.capabilityBadge} title="Supports reference images">
                <Image size={12} />
                <span>References</span>
              </span>
            )}
            {selectedModel.capabilities.supportsEditing && (
              <span className={styles.capabilityBadge} title="Supports image editing">
                <Wand2 size={12} />
                <span>Editing</span>
              </span>
            )}
          </div>

          {/* Warning if model doesn't support current context */}
          {isModelOverridden && context?.hasReferenceImages && (
            <div className={styles.warning}>This model doesn&apos;t support reference images. Your references will be ignored.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
