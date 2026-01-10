import type { CSSProperties, DragEvent, ClipboardEvent as ReactClipboardEvent } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';

interface ProductAssetDropZoneProps {
  onAssetSelected: (file: File | null) => void;
  currentAsset: File | null;
  preview: string | null;
}

const isSupportedProductAsset = (file: File) => file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.glb');

const pickSupportedAsset = (files: File[]) => files.find((candidate) => isSupportedProductAsset(candidate)) ?? null;

const pickClipboardImage = (files: File[]) => files.find((candidate) => candidate.type.startsWith('image/')) ?? null;

export function ProductAssetDropZone({ onAssetSelected, currentAsset, preview }: ProductAssetDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const onAssetSelectedRef = useRef(onAssetSelected);

  useEffect(() => {
    onAssetSelectedRef.current = onAssetSelected;
  }, [onAssetSelected]);

  const handleAssetSelection = useCallback((file: File | null) => {
    if (!file || !isSupportedProductAsset(file)) return;
    onAssetSelectedRef.current(file);
  }, []);

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    const file = pickSupportedAsset(files);
    handleAssetSelection(file);
  };

  const handlePaste = (event: ReactClipboardEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const files = Array.from(event.clipboardData.files);
    const file = pickClipboardImage(files);
    if (file) {
      handleAssetSelection(file);
    }
  };

  const dropZoneStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '18px',
    borderRadius: '16px',
    border: isDragging ? '1px solid rgba(94, 234, 212, 0.65)' : '1px dashed rgba(148, 163, 184, 0.35)',
    background: isDragging ? 'rgba(15, 118, 110, 0.35)' : 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    position: 'relative',
    outline: isDragging ? '2px solid rgba(94, 234, 212, 0.35)' : 'none',
    transition: 'border 0.2s ease, background 0.2s ease, outline 0.2s ease',
  };

  return (
    <label
      style={dropZoneStyle}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
      role="button"
      aria-label="Upload product asset"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          (event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null)?.click();
        }
      }}
    >
      <input
        type="file"
        accept="image/*,.glb"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          const file = pickSupportedAsset(files);
          event.target.value = '';
          handleAssetSelection(file);
        }}
        style={{ display: 'none' }}
      />
      {currentAsset && currentAsset.type.startsWith('image/') && preview ? (
        <img src={preview} alt="Uploaded product" style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', height: '180px' }} />
      ) : currentAsset ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '2rem' }}>📦</span>
          <strong>{currentAsset.name}</strong>
          <span style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.7)' }}>Asset ready for Gemini context</span>
        </div>
      ) : (
        <>
          <span style={{ fontSize: '2.5rem' }}>📁</span>
          <strong>Drop product asset</strong>
          <span style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.7)' }}>
            PNG, JPG, or GLB • Magnific.ai upscales automatically
          </span>
        </>
      )}
      <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.8)', marginTop: '8px' }}>
        Click to browse · drag & drop · paste (⌘/Ctrl+V)
      </span>
    </label>
  );
}
