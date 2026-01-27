'use client';

/**
 * BulkGLBPreview - Optimized for bulk processing
 * Maintains persistent Babylon scene/engine across multiple GLB loads
 * Only camera settings are captured between products
 */

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { colors } from '@/lib/styles/common-styles';
import { buildTestId } from '@/lib/utils/test-ids';

const DEFAULT_BETA = Math.PI / 3;
const DEFAULT_FOV = 1.2; // Default field of view in radians

interface CameraDefaults {
  radius: number;
  minRadius: number;
  maxRadius: number;
}

export interface CameraState {
  alpha: number;
  beta: number;
  radius: number;
  fov: number;
  defaults?: CameraDefaults;
}

export interface BulkGLBPreviewHandle {
  getCameraState: () => CameraState | null;
  loadNextModel: (source: File | string, initialCamera?: { beta?: number; radius?: number; fov?: number }) => Promise<void>;
  captureScreenshot: () => Promise<{ dataUrl: string; jpegPreview: string; cameraState: CameraState } | null>;
}

interface BulkGLBPreviewProps {
  initialSource: File | string; // Can be File object or S3 URL
  initialCamera?: {
    beta?: number;
    radius?: number;
    fov?: number;
  };
  disabled?: boolean;
  onCameraReady?: (state: CameraState) => void;
}

export const BulkGLBPreview = forwardRef<BulkGLBPreviewHandle, BulkGLBPreviewProps>(
  ({ initialSource, initialCamera, disabled = false, onCameraReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<BABYLON.Engine | null>(null);
    const sceneRef = useRef<BABYLON.Scene | null>(null);
    const cameraRef = useRef<BABYLON.ArcRotateCamera | null>(null);
    const currentModelRef = useRef<BABYLON.AbstractMesh[]>([]);
    const radiusBoundsRef = useRef<CameraDefaults | null>(null);
    const cameraObserverRef = useRef<BABYLON.Nullable<BABYLON.Observer<BABYLON.Camera>>>(null);
    const animationFrameRef = useRef<number | null>(null);
    const mountedRef = useRef(true);

    const [beta, setBeta] = useState(initialCamera?.beta ?? DEFAULT_BETA);
    const [radius, setRadius] = useState<number | null>(initialCamera?.radius ?? null);
    const [fov, setFov] = useState(initialCamera?.fov ?? DEFAULT_FOV);
    const [isLoading, setIsLoading] = useState(true);
    const [sceneReady, setSceneReady] = useState(false);

    // Initialize engine and scene once
    useEffect(() => {
      if (!canvasRef.current) return;

      // Reset mounted state on each mount (important for Strict Mode)
      mountedRef.current = true;

      console.log('🎬 BulkGLBPreview: Initializing persistent Babylon scene');

      const canvas = canvasRef.current;
      const engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        alpha: true,
        premultipliedAlpha: false,
      });
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      sceneRef.current = scene;
      scene.clearColor = new BABYLON.Color4(230 / 255, 230 / 255, 230 / 255, 1);

      // Setup lighting (once)
      const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
      light.intensity = 1.0;

      const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1), scene);
      dirLight.intensity = 0.8;

      // Create camera once
      scene.createDefaultCamera(true, true, true);
      const camera = scene.activeCamera as BABYLON.ArcRotateCamera;
      cameraRef.current = camera;

      camera.lowerRadiusLimit = 0.1;
      camera.upperRadiusLimit = 1000;
      camera.attachControl(canvas, true);

      // Setup camera observer for real-time updates
      const reportCamera = () => {
        if (!mountedRef.current) return;
        setBeta(camera.beta);
        setRadius(camera.radius);
        setFov(camera.fov);
      };

      cameraObserverRef.current = camera.onViewMatrixChangedObservable.add(reportCamera);

      // Start render loop
      const renderLoop = () => {
        if (mountedRef.current && scene && !scene.isDisposed) {
          scene.render();
          animationFrameRef.current = requestAnimationFrame(renderLoop);
        }
      };
      renderLoop();

      console.log('✅ BulkGLBPreview: Scene initialized, ready to load models');
      setSceneReady(true);

      // Cleanup on unmount
      return () => {
        console.log('🧹 BulkGLBPreview: Disposing persistent scene and engine');
        mountedRef.current = false;
        setSceneReady(false);

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        if (cameraObserverRef.current && camera) {
          camera.onViewMatrixChangedObservable.remove(cameraObserverRef.current);
        }

        if (scene && !scene.isDisposed) {
          scene.dispose();
        }

        if (engine && !engine.isDisposed) {
          engine.dispose();
        }
      };
    }, []); // Only run once on mount

    // Load initial model after scene is ready
    useEffect(() => {
      if (sceneReady) {
        loadModel(initialSource, initialCamera);
      }
    }, [sceneReady]); // Only depends on sceneReady, initialSource is stable

    const loadModel = async (source: File | string, cameraSettings?: { beta?: number; radius?: number; fov?: number }) => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;

      if (!scene || !camera || scene.isDisposed) {
        console.error('Scene or camera not initialized or already disposed');
        return;
      }

      if (!mountedRef.current) {
        console.log('⏸️  Component unmounted, skipping model load');
        return;
      }

      setIsLoading(true);

      try {
        // Dispose previous model meshes
        if (currentModelRef.current.length > 0) {
          console.log('🗑️  Disposing previous model meshes');
          currentModelRef.current.forEach((mesh) => {
            mesh.dispose();
          });
          currentModelRef.current = [];
        }

        // Load new model - handle both File and URL
        let glbUrl: string;
        let shouldRevokeUrl = false;

        if (typeof source === 'string') {
          // Source is an S3 URL
          console.log('📦 Loading model from URL:', source);
          glbUrl = source;
        } else {
          // Source is a File object
          console.log('📦 Loading model from file:', source.name);
          const arrayBuffer = await source.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          glbUrl = URL.createObjectURL(new Blob([uint8], { type: 'model/gltf-binary' }));
          shouldRevokeUrl = true;
        }

        const result = await BABYLON.SceneLoader.AppendAsync('', glbUrl, scene, undefined, '.glb');

        if (shouldRevokeUrl) {
          URL.revokeObjectURL(glbUrl);
        }

        // Store new model meshes for cleanup later
        currentModelRef.current = scene.meshes.filter((m) => m.isVisible && m.getTotalVertices() > 0);
        console.log(`✅ Model loaded: ${currentModelRef.current.length} meshes`);

        // Calculate bounding box and setup camera
        if (currentModelRef.current.length > 0) {
          let min = currentModelRef.current[0].getBoundingInfo().boundingBox.minimumWorld.clone();
          let max = currentModelRef.current[0].getBoundingInfo().boundingBox.maximumWorld.clone();

          currentModelRef.current.forEach((mesh) => {
            const boundingInfo = mesh.getBoundingInfo();
            min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
            max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
          });

          const center = BABYLON.Vector3.Center(min, max);
          const size = max.subtract(min);
          const maxDimension = Math.max(size.x, size.y, size.z);

          camera.target = center;

          const defaultRadius = maxDimension * 2.5;
          const appliedRadius = cameraSettings?.radius ?? defaultRadius;
          camera.radius = appliedRadius;

          const betaValue = cameraSettings?.beta ?? DEFAULT_BETA;
          camera.beta = betaValue;

          const fovValue = cameraSettings?.fov ?? DEFAULT_FOV;
          camera.fov = fovValue;

          // Store camera defaults
          const minRadius = defaultRadius * 0.5;
          const maxRadius = defaultRadius * 2.0;

          radiusBoundsRef.current = {
            radius: defaultRadius,
            minRadius,
            maxRadius,
          };

          setBeta(betaValue);
          setRadius(appliedRadius);
          setFov(fovValue);

          // Notify parent
          const state: CameraState = {
            alpha: camera.alpha,
            beta: betaValue,
            radius: appliedRadius,
            fov: fovValue,
            defaults: radiusBoundsRef.current,
          };
          onCameraReady?.(state);

          console.log(`📹 Camera configured: beta=${betaValue.toFixed(2)}, radius=${appliedRadius.toFixed(2)}, fov=${fovValue.toFixed(2)}`);
        }

        await scene.whenReadyAsync();
        setIsLoading(false);
        console.log('✅ Model ready');
      } catch (error) {
        console.error('❌ Failed to load model:', error);
        setIsLoading(false);
      }
    };

    const captureScreenshot = async (): Promise<{ dataUrl: string; jpegPreview: string; cameraState: CameraState } | null> => {
      const canvas = canvasRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const engine = engineRef.current;

      if (!canvas || !camera || !scene || !engine || scene.isDisposed || engine.isDisposed) {
        console.error('Cannot capture screenshot: scene not ready');
        return null;
      }

      console.log('📸 Capturing screenshot with camera state:', {
        alpha: camera.alpha.toFixed(3),
        beta: camera.beta.toFixed(3),
        radius: camera.radius.toFixed(3),
        fov: camera.fov.toFixed(3),
      });

      // Force a render to ensure the current state is captured
      scene.render();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture PNG with transparency
      const pngDataUrl = canvas.toDataURL('image/png');

      // Generate JPEG preview with white background
      const jpegPreview = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const previewCanvas = document.createElement('canvas');
          previewCanvas.width = img.width;
          previewCanvas.height = img.height;
          const ctx = previewCanvas.getContext('2d')!;

          // White background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
          ctx.drawImage(img, 0, 0);

          resolve(previewCanvas.toDataURL('image/jpeg', 0.95));
        };
        img.src = pngDataUrl;
      });

      const cameraState: CameraState = {
        alpha: camera.alpha,
        beta: camera.beta,
        radius: camera.radius,
        fov: camera.fov,
        defaults: radiusBoundsRef.current ?? undefined,
      };

      console.log('✅ Screenshot captured successfully');

      return { dataUrl: pngDataUrl, jpegPreview, cameraState };
    };

    useImperativeHandle(ref, () => ({
      getCameraState: () => {
        const camera = cameraRef.current;
        if (!camera) return null;
        return {
          alpha: camera.alpha,
          beta: camera.beta,
          radius: camera.radius,
          fov: camera.fov,
          defaults: radiusBoundsRef.current ?? undefined,
        };
      },
      loadNextModel: async (source: File | string, initialCamera?: { beta?: number; radius?: number; fov?: number }) => {
        await loadModel(source, initialCamera);
      },
      captureScreenshot,
    }));

    const betaDegrees = Math.round((beta * 180) / Math.PI);
    const radiusDisplay = radius?.toFixed(2) ?? 'auto';
    const fovDegrees = Math.round((fov * 180) / Math.PI);

    const handleFovChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFov = parseFloat(e.target.value);
      setFov(newFov);
      if (cameraRef.current) {
        cameraRef.current.fov = newFov;
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1',
            backgroundColor: colors.slate[900],
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', opacity: disabled ? 0.5 : 1 }} />
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    border: `3px solid ${colors.indigo[500]}`,
                    borderTop: '3px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 12px',
                  }}
                />
                <p style={{ color: colors.slate[300], fontSize: '14px' }}>Loading model...</p>
              </div>
            </div>
          )}
        </div>

        {/* Camera info display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: colors.slate[400] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Beta Angle:</span>
            <span style={{ color: colors.slate[200] }}>{betaDegrees}°</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Radius:</span>
            <span style={{ color: colors.slate[200] }}>{radiusDisplay}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Field of View:</span>
              <span style={{ color: colors.slate[200] }}>{fovDegrees}°</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.01"
              value={fov}
              onChange={handleFovChange}
              disabled={disabled || isLoading}
              style={{
                width: '100%',
                cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
                opacity: disabled || isLoading ? 0.5 : 1,
              }}
              data-testid={buildTestId('bulk-glb-preview', 'fov-slider')}
            />
          </div>
          <div style={{ fontSize: '12px', color: colors.slate[500], marginTop: '4px' }}>💡 Drag to rotate • Scroll to zoom</div>
        </div>

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }
);

BulkGLBPreview.displayName = 'BulkGLBPreview';
