// components/ChatView/ChatInput.tsx
import React from 'react';
import { Send, Loader2, Image as ImageIcon, X } from 'lucide-react';
import type { PromptSettings } from '@/lib/types/app-types';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './ChatView.module.scss';

interface ChatInputProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  isGenerating: boolean;
  promptSettings: PromptSettings;
  onRemoveSettingTag: (key: keyof PromptSettings) => void;
  inspirationPreview: string | null;
  onRemoveInspiration: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null> | React.RefObject<HTMLInputElement>;
}

export function ChatInput({
  inputText,
  onInputChange,
  onSend,
  isGenerating,
  promptSettings,
  onRemoveSettingTag,
  inspirationPreview,
  onRemoveInspiration,
  onImageSelect,
  fileInputRef,
}: ChatInputProps) {
  const getActiveSettings = (): Array<{ key: keyof PromptSettings; label: string; value: string }> => {
    const settings: Array<{ key: keyof PromptSettings; label: string; value: string }> = [];

    const getValue = (key: keyof PromptSettings, label: string, customKey?: keyof PromptSettings): string | null => {
      const settingValue = promptSettings[key];
      if (settingValue === 'Custom' && customKey) {
        return (promptSettings[customKey] as string) || null;
      }
      return typeof settingValue === 'string' || typeof settingValue === 'number' ? String(settingValue) : null;
    };

    const scene = getValue('scene', 'Scene', 'customScene');
    if (scene) settings.push({ key: 'scene', label: 'Scene', value: scene });

    const style = getValue('style', 'Style', 'customStyle');
    if (style) settings.push({ key: 'style', label: 'Style', value: style });

    const lighting = getValue('lighting', 'Lighting', 'customLighting');
    if (lighting) settings.push({ key: 'lighting', label: 'Lighting', value: lighting });

    const surroundings = getValue('surroundings', 'Surroundings', 'customSurroundings');
    if (surroundings) settings.push({ key: 'surroundings', label: 'Surroundings', value: surroundings });

    const aspectRatio = getValue('aspectRatio', 'Aspect Ratio');
    if (aspectRatio) settings.push({ key: 'aspectRatio', label: 'Aspect Ratio', value: aspectRatio });

    return settings;
  };

  const activeSettings = getActiveSettings();

  return (
    <div className={styles.inputArea}>
      {/* Context Tags */}
      {activeSettings.length > 0 && (
        <div className={styles.contextTags}>
          {activeSettings.map((setting) => (
            <div key={setting.key} className={styles.tag}>
              <span>
                {setting.label}: {setting.value}
              </span>
              <button
                onClick={() => onRemoveSettingTag(setting.key as keyof PromptSettings)}
                className={styles.tagClose}
                data-testid={buildTestId('chat-input', 'remove-setting', setting.label)}
              >
                <X style={{ width: '12px', height: '12px' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inspiration Image Preview */}
      {inspirationPreview && (
        <div className={styles.inspirationPreview}>
          <img src={inspirationPreview} alt="Inspiration" className={styles.inspirationImage} />
          <button
            onClick={onRemoveInspiration}
            className={styles.removeButton}
            data-testid={buildTestId('chat-input', 'remove-inspiration')}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className={styles.inputRow}>
        <div className={styles.inputWrapper}>
          <textarea
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Add specific instructions..."
            rows={2}
            className={styles.textarea}
            data-testid={buildTestId('chat-input', 'prompt-textarea')}
          />
          <input
            ref={fileInputRef as React.RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            onChange={onImageSelect}
            style={{ display: 'none' }}
            data-testid={buildTestId('chat-input', 'image-uploader')}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={styles.imageButton}
            aria-label="Add inspiration image"
            data-testid={buildTestId('chat-input', 'add-image-button')}
          >
            <ImageIcon style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
        <button
          onClick={onSend}
          disabled={isGenerating}
          className={styles.sendButton}
          data-testid={buildTestId('chat-input', 'send-button')}
        >
          {isGenerating ? (
            <>
              <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
              Generating...
            </>
          ) : (
            <>
              <Send style={{ width: '20px', height: '20px' }} />
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
}
