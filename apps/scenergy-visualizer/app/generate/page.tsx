'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { Section } from '@/components/Section';
import type { VariantPreview } from '@/lib/services';
import { buildPrompt } from '@/lib/prompt';
import { locationGroups, stylePresets, lightingPresets, cameraPresets, propPresets } from '@/lib/constants';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './page.module.scss';
import clsx from 'clsx';
import commonStyles from '@/styles/common.module.scss';
// Using native HTML inputs for compatibility

const SESSION_STORAGE_KEY = 'scenergy:visualizer:last-session';
const variantFocusPresets = [
  'balanced hero shot with gentle reflections',
  'emphasize background ambience with deeper depth-of-field',
  'introduce bokeh highlights from ambient lighting',
  'include a slightly wider frame with additional props',
  'tight macro crop highlighting texture details',
];

interface StoredSession {
  jobId: string;
  createdAt: string;
  prompt: string;
  variants: VariantPreview[];
  magnify: boolean;
  moodNotes: string;
  styleTags: string[];
  productName: string;
  productLabel: string;
  resolved: {
    location: string;
    style: string;
    lighting: string;
    camera: string;
    props: string;
  };
  asset: {
    name: string;
    type: string;
    dataUrl: string;
  } | null;
  uploadedAsset: {
    url: string;
    type: 'image' | 'model';
    preview?: string;
  } | null;
  request: {
    location: string;
    customLocation: string;
    style: string;
    customStyle: string;
    lighting: string;
    customLighting: string;
    camera: string;
    customCamera: string;
    cameraNotes: string;
    props: string;
    customProps: string;
    aspectRatio: string;
    resolution: string;
    variants: number;
    magnify: boolean;
  };
}

interface JobSnapshot {
  status: 'pending' | 'generating' | 'completed' | 'error';
  updatedAt: string;
  session: {
    variants: VariantPreview[];
    imageUrl?: string;
  } | null;
  rawSession: unknown;
  error?: string | null;
}

export default function GenerationWorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [jobSnapshot, setJobSnapshot] = useState<JobSnapshot | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<number | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [editLocation, setEditLocation] = useState('');
  const [editStyle, setEditStyle] = useState('');
  const [editLighting, setEditLighting] = useState('');
  const [editCamera, setEditCamera] = useState('');
  const [editProps, setEditProps] = useState('');
  const [isApplyingEdits, setIsApplyingEdits] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState('');

  const locationOptions = useMemo(() => Object.entries(locationGroups).flatMap(([, options]) => options), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      const normalized: StoredSession = {
        jobId: parsed.jobId ?? '',
        createdAt: parsed.createdAt ?? new Date().toISOString(),
        prompt: parsed.prompt ?? '',
        variants: parsed.variants ?? [],
        magnify: parsed.magnify ?? true,
        moodNotes: parsed.moodNotes ?? '',
        styleTags: parsed.styleTags ?? [],
        productName: parsed.productName ?? '',
        productLabel: parsed.productLabel ?? '',
        resolved: {
          location: parsed.resolved?.location ?? '',
          style: parsed.resolved?.style ?? '',
          lighting: parsed.resolved?.lighting ?? '',
          camera: parsed.resolved?.camera ?? '',
          props: parsed.resolved?.props ?? '',
        },
        asset: parsed.asset ?? null,
        uploadedAsset: parsed.uploadedAsset ?? null,
        request: {
          location: parsed.request?.location ?? parsed.resolved?.location ?? '',
          customLocation: parsed.request?.customLocation ?? '',
          style: parsed.request?.style ?? parsed.resolved?.style ?? '',
          customStyle: parsed.request?.customStyle ?? '',
          lighting: parsed.request?.lighting ?? parsed.resolved?.lighting ?? '',
          customLighting: parsed.request?.customLighting ?? '',
          camera: parsed.request?.camera ?? parsed.resolved?.camera ?? '',
          customCamera: parsed.request?.customCamera ?? '',
          cameraNotes: parsed.request?.cameraNotes ?? '',
          props: parsed.request?.props ?? parsed.resolved?.props ?? '',
          customProps: parsed.request?.customProps ?? '',
          aspectRatio: parsed.request?.aspectRatio ?? '16:9',
          resolution: parsed.request?.resolution ?? '4K',
          variants: parsed.request?.variants ?? parsed.variants?.length ?? 1,
          magnify: parsed.request?.magnify ?? parsed.magnify ?? true,
        },
      };

      setSession(normalized);
      setImageSrc(normalized.asset?.dataUrl ?? null);
      if (normalized.variants.length > 0) {
        setActiveVariantId(normalized.variants[0].id);
      }
    } catch (error) {
      console.error('Failed to restore generation session:', error);
    }
  }, []);

  useEffect(() => {
    if (!session?.jobId) return;
    let isActive = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/visualization/${session.jobId}`);
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        const payload = await response.json();
        if (!isActive) return;

        const snapshot: JobSnapshot = {
          status: payload.status,
          updatedAt: payload.updatedAt,
          session: payload.session
            ? {
                variants: payload.session.variants ?? [],
                imageUrl: payload.session.variants?.find((variant: VariantPreview) => variant.imageUrl)?.imageUrl,
              }
            : null,
          rawSession: payload.session,
          error: payload.error ?? null,
        };

        setJobSnapshot(snapshot);

        if (payload.session?.variants?.length) {
          const completedVariant = payload.session.variants.find((variant: VariantPreview) => variant.status === 'completed');
          if (completedVariant?.imageUrl) {
            setImageSrc(completedVariant.imageUrl);
            setActiveVariantId(completedVariant.id);
          }
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
      }
    };

    fetchStatus();
    const interval = window.setInterval(fetchStatus, 30000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [session?.jobId]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => setImageReady(true), 900);
    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setEditLocation(session.resolved.location || session.request.location || '');
    setEditStyle(session.resolved.style || session.request.style || '');
    setEditLighting(session.resolved.lighting || session.request.lighting || '');
    setEditCamera(session.resolved.camera || session.request.camera || '');
    setEditProps(session.resolved.props || session.request.props || '');
    setEditablePrompt(session.prompt);
  }, [session]);

  useEffect(() => {
    if (jobSnapshot?.status === 'completed') {
      setImageReady(true);
    }
  }, [jobSnapshot?.status]);

  const variantSource = useMemo(() => {
    if (jobSnapshot?.session?.variants?.length) {
      return jobSnapshot.session.variants as VariantPreview[];
    }
    return session?.variants ?? [];
  }, [jobSnapshot?.session?.variants, session?.variants]);

  const activeVariant = useMemo(() => {
    if (!variantSource.length) return null;
    if (activeVariantId == null) return variantSource[0];
    return variantSource.find((variant) => variant.id === activeVariantId) ?? variantSource[0];
  }, [variantSource, activeVariantId]);

  useEffect(() => {
    if (activeVariant?.imageUrl) {
      setImageSrc(activeVariant.imageUrl);
    }
  }, [activeVariant?.imageUrl]);

  const ensureUploadedAsset = useCallback(async () => {
    if (!session) return null;
    if (session.uploadedAsset) {
      return session.uploadedAsset;
    }
    if (!session.asset?.dataUrl) {
      return null;
    }

    try {
      const response = await fetch(session.asset.dataUrl);
      const blob = await response.blob();
      const fileName = session.asset.name || 'product-asset.png';
      const fileType = session.asset.type || blob.type || 'image/png';
      const file = new File([blob], fileName, { type: fileType });

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const payload = await uploadResponse.json().catch(() => ({}));
        throw new Error(payload.error || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const assetType: 'image' | 'model' = fileType.startsWith('model') ? 'model' : 'image';

      return {
        url: uploadData.url,
        type: assetType,
        preview: session.asset.dataUrl,
      };
    } catch (error) {
      console.error('Unable to ensure uploaded asset:', error);
      return null;
    }
  }, [session]);

  const handleApplyEdits = useCallback(async () => {
    if (!session) return;

    setIsApplyingEdits(true);
    setImageReady(false);
    setImageSrc(null);
    setJobSnapshot(null);
    setActiveVariantId(null);

    const assetForApi = await ensureUploadedAsset();
    if (!assetForApi) {
      window.alert('Unable to locate the uploaded product asset for regeneration.');
      setIsApplyingEdits(false);
      return;
    }

    const payload = {
      productName: session.productName || session.productLabel || 'AI Product Visualization',
      productAsset: assetForApi,
      location: editLocation,
      style: editStyle,
      lighting: editLighting,
      camera: editCamera,
      cameraNotes: session.request.cameraNotes,
      props: editProps,
      moodNotes: session.moodNotes,
      aspectRatio: session.request.aspectRatio,
      resolution: session.request.resolution,
      variants: session.request.variants,
      magnify: session.request.magnify,
      customPrompt: editablePrompt || undefined,
    };

    try {
      const response = await fetch('/api/visualization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => ({}));
        throw new Error(payloadError.error || 'Failed to enqueue visualization job');
      }

      const data = (await response.json()) as { jobId: string };

      // Use the editable prompt if available, otherwise build a new one
      const newPrompt =
        editablePrompt ||
        buildPrompt({
          productName: session.productName,
          location: editLocation,
          style: editStyle,
          lighting: editLighting,
          camera: editCamera,
          cameraNotes: session.request.cameraNotes,
          props: editProps,
          moodNotes: session.moodNotes,
          aspectRatio: session.request.aspectRatio,
          resolution: session.request.resolution,
          variants: session.request.variants,
          magnify: session.request.magnify,
        });

      const placeholderVariants: VariantPreview[] = Array.from({ length: session.request.variants }, (_, index) => ({
        id: index + 1,
        summary: index === 0 ? 'Primary composition' : `Exploration ${index}`,
        prompt: `${newPrompt} ${variantFocusPresets[index] ?? variantFocusPresets[variantFocusPresets.length - 1]}`,
        status: index === 0 ? 'generating' : 'pending',
      }));

      const updatedSession: StoredSession = {
        ...session,
        jobId: data.jobId,
        createdAt: new Date().toISOString(),
        prompt: newPrompt,
        variants: placeholderVariants,
        resolved: {
          location: editLocation,
          style: editStyle,
          lighting: editLighting,
          camera: editCamera,
          props: editProps,
        },
        uploadedAsset: assetForApi,
        request: {
          ...session.request,
          location: editLocation,
          customLocation: '',
          style: editStyle,
          customStyle: '',
          lighting: editLighting,
          customLighting: '',
          camera: editCamera,
          customCamera: '',
          props: editProps,
          customProps: '',
        },
      };

      setSession(updatedSession);
      setImageSrc(updatedSession.asset?.dataUrl ?? null);
      setJobSnapshot({
        status: 'pending',
        updatedAt: new Date().toISOString(),
        session: null,
        rawSession: null,
        error: null,
      });
      setActiveVariantId(1);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Failed to apply edits:', error);
      window.alert(error instanceof Error ? error.message : 'Unable to regenerate with new settings.');
    } finally {
      setIsApplyingEdits(false);
    }
  }, [session, ensureUploadedAsset, editLocation, editStyle, editLighting, editCamera, editProps, editablePrompt]);

  const imageFilter = useMemo(() => {
    const brightness = 100 + exposure;
    const contrastValue = 100 + contrast;
    const saturationValue = 100 + saturation;
    const hue = temperature * 1.5;
    return `brightness(${brightness}%) contrast(${contrastValue}%) saturate(${saturationValue}%) hue-rotate(${hue}deg)`;
  }, [exposure, contrast, saturation, temperature]);

  const vignetteOpacity = useMemo(() => Math.min(Math.max(vignette, 0), 100) / 100, [vignette]);

  const handleReturnToBuilder = () => {
    router.push('/' as Route);
  };

  const handleResetAdjustments = () => {
    setExposure(0);
    setContrast(0);
    setSaturation(0);
    setTemperature(0);
    setVignette(0);
  };

  const handleToggleVariantSelection = useCallback((variantId: number) => {
    setSelectedVariants((prev) => (prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]));
  }, []);

  const handleDownloadActive = useCallback(async () => {
    if (!activeVariant?.imageUrl) return;
    try {
      // Use proxy to avoid CORS issues
      const proxyUrl = `/api/download-image?url=${encodeURIComponent(activeVariant.imageUrl)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-variant-${activeVariant.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      window.alert('Failed to download image');
    }
  }, [activeVariant]);

  const handleDownloadSelected = useCallback(async () => {
    if (selectedVariants.length === 0) return;
    for (const variantId of selectedVariants) {
      const variant = variantSource.find((v) => v.id === variantId);
      if (variant?.imageUrl) {
        try {
          // Use proxy to avoid CORS issues
          const proxyUrl = `/api/download-image?url=${encodeURIComponent(variant.imageUrl)}`;
          const response = await fetch(proxyUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `generated-variant-${variant.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Failed to download image:', error);
        }
      }
    }
  }, [selectedVariants, variantSource]);

  const handleShareSelected = useCallback(async () => {
    if (selectedVariants.length === 0) return;
    if (navigator.share) {
      const files: File[] = [];
      for (const variantId of selectedVariants) {
        const variant = variantSource.find((v) => v.id === variantId);
        if (variant?.imageUrl) {
          try {
            // Use proxy to avoid CORS issues
            const proxyUrl = `/api/download-image?url=${encodeURIComponent(variant.imageUrl)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            const file = new File([blob], `variant-${variant.id}.png`, { type: 'image/png' });
            files.push(file);
          } catch (error) {
            console.error('Failed to prepare image for sharing:', error);
          }
        }
      }
      if (files.length > 0 && navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files } as unknown as ShareData);
      } else {
        window.alert('Your browser does not support sharing multiple files');
      }
    } else {
      window.alert('Sharing is not supported in your browser');
    }
  }, [selectedVariants, variantSource]);

  if (!session) {
    return (
      <main
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <Section title="Generation workspace" description="No staged session found.">
          <p style={{ margin: 0, color: 'rgba(226, 232, 240, 0.7)', fontSize: '0.95rem' }}>
            Start from the visualizer, configure your scene, and launch the generation workspace again.
          </p>
          <button
            onClick={handleReturnToBuilder}
            className={commonStyles.buttonPrimary}
            data-testid={buildTestId('generate-page', 'return-to-builder')}
          >
            Back to visualizer
          </button>
        </Section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        {' '}
        <div className={styles.headerActions}>
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#e2e8f0',
              padding: '8px',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
            }}
            data-testid={buildTestId('generate-page', 'toggle-drawer')}
          >
            ✏️
          </button>
          <h1 className={styles.headerTitle}>Generation Workspace</h1>
        </div>
        <button
          onClick={handleReturnToBuilder}
          style={{
            padding: '8px 16px',
            background: 'rgba(148, 163, 184, 0.2)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '8px',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
          data-testid={buildTestId('generate-page', 'return-to-builder-secondary')}
        >
          Back to Builder
        </button>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Drawer */}
        {isDrawerOpen && (
          <div className={styles.drawer}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600 }}>Scene Settings</h2>

            {/* Prompt Editor */}
            <div>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '8px', color: 'rgba(226, 232, 240, 0.9)' }}>Customize Prompt</h3>
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className={clsx(commonStyles.input, styles.promptTextarea)}
                placeholder="Edit the prompt..."
              />
              <p style={{ fontSize: '0.75rem', color: 'rgba(226, 232, 240, 0.6)', margin: '8px 0 0 0' }}>
                Modify the prompt above to customize the scene. System enhancements are applied automatically.
              </p>
            </div>

            {/* Image Adjustments */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.95rem', color: 'rgba(226, 232, 240, 0.9)' }}>Image Adjustments</h3>
                <button
                  onClick={handleResetAdjustments}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                  }}
                  data-testid={buildTestId('generate-page', 'reset-adjustments')}
                >
                  Reset
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Exposure', value: exposure, onChange: setExposure, min: -20, max: 20 },
                  { label: 'Contrast', value: contrast, onChange: setContrast, min: -30, max: 30 },
                  { label: 'Saturation', value: saturation, onChange: setSaturation, min: -40, max: 40 },
                  { label: 'Color Warmth', value: temperature, onChange: setTemperature, min: -20, max: 20 },
                  { label: 'Vignette', value: vignette, onChange: setVignette, min: 0, max: 80 },
                ].map(({ label, value, onChange, min, max }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.9)' }}>{label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(226, 232, 240, 0.7)' }}>{value > 0 ? `+${value}` : value}</span>
                    </div>
                    <input
                      type="range"
                      value={value}
                      onChange={(e) => onChange(Number(e.target.value))}
                      min={min}
                      max={max}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Scene Settings */}
            <div>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'rgba(226, 232, 240, 0.9)' }}>Edit Scene</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.9)' }}>Location</label>
                  <select value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className={commonStyles.input}>
                    {locationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.9)' }}>Style</label>
                  <select value={editStyle} onChange={(e) => setEditStyle(e.target.value)} className={commonStyles.input}>
                    {stylePresets.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.9)' }}>Lighting</label>
                  <select value={editLighting} onChange={(e) => setEditLighting(e.target.value)} className={commonStyles.input}>
                    {lightingPresets.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.9)' }}>Camera</label>
                  <select value={editCamera} onChange={(e) => setEditCamera(e.target.value)} className={commonStyles.input}>
                    {cameraPresets.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.9)' }}>Props</label>
                  <select value={editProps} onChange={(e) => setEditProps(e.target.value)} className={commonStyles.input}>
                    {propPresets.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleApplyEdits}
                  disabled={isApplyingEdits}
                  className={commonStyles.buttonPrimary}
                  data-testid={buildTestId('generate-page', 'apply-edits')}
                >
                  {isApplyingEdits ? 'Applying...' : 'Apply Changes'}
                </button>
              </div>
            </div>

            <button onClick={() => setIsDrawerOpen(false)} className={styles.closeButton}>
              ×
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className={styles.contentArea}>
          <div className={styles.previewGrid}>
            {/* Original Asset */}
            <div className={styles.originalAssetCard}>
              {session.asset?.dataUrl ? (
                <img
                  src={session.asset.dataUrl}
                  alt={session.productLabel || 'Uploaded product'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '12px',
                  }}
                />
              ) : (
                <div
                  style={{
                    color: 'rgba(226, 232, 240, 0.7)',
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    lineHeight: 1.5,
                  }}
                >
                  Upload a product asset in the visualizer to compare against generated visuals.
                </div>
              )}
              <span className={styles.originalAssetBadge}>Original asset</span>
            </div>

            {/* Generated Preview */}
            <div className={styles.generatedPreviewCard}>
              {imageSrc ? (
                <>
                  <img
                    src={imageSrc}
                    alt={session.productLabel || 'Generated product scene'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transition: 'filter 0.25s ease',
                      filter: imageFilter,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(circle, transparent 60%, rgba(15, 23, 42, 0.85) 100%)',
                      pointerEvents: 'none',
                      opacity: vignetteOpacity,
                      transition: 'opacity 0.25s ease',
                    }}
                  />
                </>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(226, 232, 240, 0.7)',
                    fontSize: '1rem',
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  {!imageReady ? (
                    <>
                      <span className="animate-spin" style={{ fontSize: '1.5rem', marginRight: '12px' }}>
                        🎨
                      </span>
                      Preparing variants...
                    </>
                  ) : (
                    'Upload an asset in the visualizer to see it here in full fidelity.'
                  )}
                </div>
              )}

              <span className={styles.generatedPreviewBadge}>Generated preview</span>

              {/* Download button on top right */}
              {imageSrc && (
                <button
                  onClick={handleDownloadActive}
                  className={styles.downloadButton}
                  data-testid={buildTestId('generate-page', 'download-active-image')}
                >
                  ⬇️
                </button>
              )}
            </div>
          </div>

          {/* Variant Gallery */}
          <div className={styles.variantGallery}>
            <div className={styles.variantGalleryHeader}>
              <h3 className={styles.variantGalleryTitle}>Variants</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  style={{
                    padding: '6px 12px',
                    background: isSelectMode ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                  }}
                  data-testid={buildTestId('generate-page', 'toggle-select-mode')}
                >
                  {isSelectMode ? 'Cancel' : 'Select'}
                </button>
                {isSelectMode && selectedVariants.length > 0 && (
                  <>
                    <button
                      onClick={handleDownloadSelected}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(34, 197, 94, 0.8)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                      data-testid={buildTestId('generate-page', 'download-selected')}
                    >
                      Download ({selectedVariants.length})
                    </button>
                    <button
                      onClick={handleShareSelected}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(139, 92, 246, 0.8)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                      data-testid={buildTestId('generate-page', 'share-selected')}
                    >
                      Share ({selectedVariants.length})
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={styles.variantGrid}>
              {variantSource.map((variant) => {
                const isActive = activeVariant?.id === variant.id;
                const isSelected = selectedVariants.includes(variant.id);
                const hasImage = variant.status === 'completed' && variant.imageUrl;

                return (
                  <div
                    key={variant.id}
                    onClick={() => setActiveVariantId(variant.id)}
                    className={clsx(styles.variantCard, { [styles.variantCardActive]: isActive })}
                  >
                    {hasImage ? (
                      <img src={variant.imageUrl} alt={variant.summary} className={styles.variantImage} />
                    ) : (
                      <div className={styles.variantPlaceholder}>
                        {variant.status === 'generating' ? (
                          <>
                            <span style={{ fontSize: '2rem' }}>🎨</span>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '2rem' }}>⏳</span>
                            <span>Pending</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Selection indicator */}
                    {isSelectMode && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVariantSelection(variant.id);
                        }}
                        className={clsx(styles.selectionIndicator, { [styles.selectionIndicatorSelected]: isSelected })}
                      >
                        {isSelected && <span style={{ fontSize: '1.2rem' }}>✓</span>}
                      </div>
                    )}

                    {/* Status badge */}
                    <div
                      className={styles.statusBadge}
                      style={{
                        color:
                          variant.status === 'completed'
                            ? 'var(--color-success)'
                            : variant.status === 'generating'
                              ? 'var(--color-primary)'
                              : 'var(--color-secondary)',
                      }}
                    >
                      {variant.summary}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
