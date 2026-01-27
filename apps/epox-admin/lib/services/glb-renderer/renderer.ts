/**
 * GLB to Images Renderer
 * Uses Babylon.js to render 6 views of a 3D model
 */

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Materials/Textures/Loaders/envTextureLoader';

export interface RenderOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  cameraBeta?: number;
  cameraRadius?: number;
  angles?: number[];
}

export interface RenderedImage {
  dataUrl: string;
  angle: number;
  index: number;
}

/**
 * Render a GLB file to 6 images from different angles
 * @param glbInput - The GLB file as ArrayBuffer, Uint8Array, or Blob
 * @param options - Rendering options
 * @returns Array of 6 rendered images as data URLs
 */
export async function renderGLBToImages(glbInput: ArrayBuffer | Uint8Array | Blob, options: RenderOptions = {}): Promise<RenderedImage[]> {
  const { width = 1024, height = 1024, backgroundColor = 'transparent', cameraBeta, cameraRadius, angles: customAngles } = options;

  console.log('🎨 Starting GLB rendering process...');
  console.log('📸 Render options:', {
    width,
    height,
    backgroundColor,
    cameraBeta: cameraBeta !== undefined ? `${cameraBeta.toFixed(3)} rad (${((cameraBeta * 180) / Math.PI).toFixed(1)}°)` : 'default',
    cameraRadius: cameraRadius !== undefined ? cameraRadius.toFixed(3) : 'auto-calculated',
    customAngles: customAngles ? customAngles.map((a) => `${a.toFixed(2)} rad`).join(', ') : 'default 6 angles',
  });

  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Create engine with alpha support for transparent backgrounds
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    alpha: true,
    premultipliedAlpha: false,
  });

  const scene = new BABYLON.Scene(engine);

  // Set background color (transparent or solid)
  if (backgroundColor === 'transparent') {
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    console.log('🎨 Background: Transparent');
  } else {
    const alpha = backgroundColor.length === 9 ? parseInt(backgroundColor.substring(7, 9), 16) / 255 : 1;
    scene.clearColor = BABYLON.Color4.FromHexString(backgroundColor.substring(0, 7) + 'FF');
    scene.clearColor.a = alpha;
    console.log(`🎨 Background: ${backgroundColor}`);
  }

  // Load environment texture for realistic lighting
  console.log('🌍 Loading environment texture from /environments/studioEnvironment.env');
  const envTexture = BABYLON.CubeTexture.CreateFromPrefilteredData('/environments/studioEnvironment.env', scene);
  scene.environmentTexture = envTexture;
  scene.environmentIntensity = 0.8;

  // Add lighting
  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 1.0;

  const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1), scene);
  dirLight.intensity = 0.8;

  console.log('💡 Lighting configured (Hemispheric + Directional)');

  // Normalize input to Uint8Array (works in browser without Node Buffer)
  const uint8 =
    glbInput instanceof ArrayBuffer
      ? new Uint8Array(glbInput)
      : glbInput instanceof Uint8Array
        ? glbInput
        : glbInput instanceof Blob
          ? new Uint8Array(await glbInput.arrayBuffer())
          : new Uint8Array(glbInput as any);

  // Create object URL for the GLB file
  const glbUrl = URL.createObjectURL(new Blob([uint8], { type: 'model/gltf-binary' }));

  try {
    console.log('📦 Loading GLB model...');
    await BABYLON.SceneLoader.AppendAsync('', glbUrl, scene, undefined, '.glb');
    console.log(`✅ GLB model loaded. Found ${scene.meshes.length} meshes`);
  } catch (error) {
    console.error('❌ Failed to load GLB:', error);
    throw error;
  } finally {
    // Always revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(glbUrl);
  }

  // Create default camera - it sets scene.activeCamera
  console.log('📹 Setting up camera...');
  scene.createDefaultCamera(true, true, true);
  const camera = scene.activeCamera as BABYLON.ArcRotateCamera;

  if (!camera) {
    throw new Error('Failed to create camera for rendering');
  }

  // Calculate the bounding box of all visible meshes to center the camera
  const meshes = scene.meshes.filter((m) => m.isVisible && m.getTotalVertices() > 0);
  console.log(`📊 Found ${meshes.length} visible meshes with geometry`);

  if (meshes.length > 0) {
    // Get the bounding box of the entire scene
    let min = meshes[0].getBoundingInfo().boundingBox.minimumWorld.clone();
    let max = meshes[0].getBoundingInfo().boundingBox.maximumWorld.clone();

    meshes.forEach((mesh) => {
      const boundingInfo = mesh.getBoundingInfo();
      min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
      max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
    });

    // Calculate center and size
    const center = BABYLON.Vector3.Center(min, max);
    const size = max.subtract(min);
    const maxDimension = Math.max(size.x, size.y, size.z);

    // Set camera target to the center of the bounding box
    camera.target = center;

    // Set camera radius based on model size (with some padding)
    const defaultRadius = maxDimension * 2.5;
    camera.radius = cameraRadius ?? defaultRadius;
    if (cameraRadius) {
      console.log(`🎯 Applying custom camera radius: ${cameraRadius.toFixed(2)}`);
    }

    console.log(`🎯 Camera target set to center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
    console.log(`📏 Model size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
    console.log(`📐 Camera radius set to: ${camera.radius.toFixed(2)} (default ${defaultRadius.toFixed(2)})`);
  } else {
    console.warn('⚠️ No visible meshes found, using default target');
    camera.target = BABYLON.Vector3.Zero();
  }

  // Configure camera for better framing
  camera.lowerRadiusLimit = 0.1;
  camera.upperRadiusLimit = 1000;
  camera.wheelPrecision = 50;
  camera.attachControl(canvas, true);

  if (typeof cameraBeta === 'number') {
    const beforeBeta = camera.beta;
    camera.beta = cameraBeta;
    console.log(`🎯 Applying custom camera beta: ${cameraBeta.toFixed(3)} rad (${((cameraBeta * 180) / Math.PI).toFixed(1)}°)`);
    console.log(`   Changed from ${beforeBeta.toFixed(3)} rad to ${camera.beta.toFixed(3)} rad`);
  }

  console.log(`✅ Camera configured: alpha=${camera.alpha.toFixed(2)}, beta=${camera.beta.toFixed(2)}, radius=${camera.radius.toFixed(2)}`);

  // Wait for environment texture to load (with timeout)
  console.log('⏳ Waiting for environment texture to load...');
  await Promise.race([
    new Promise<void>((resolve) => {
      if (envTexture.isReady()) {
        console.log('✅ Environment texture already ready');
        resolve();
      } else {
        envTexture.onLoadObservable.addOnce(() => {
          console.log('✅ Environment texture loaded');
          resolve();
        });
      }
    }),
    new Promise<void>((resolve) =>
      setTimeout(() => {
        console.log('⚠️ Environment texture load timeout, continuing anyway');
        resolve();
      }, 3000)
    ),
  ]);

  // Wait for the scene to be fully ready (materials, shaders, etc.)
  console.log('⏳ Waiting for scene to be ready...');
  await scene.whenReadyAsync();
  console.log('✅ Scene is ready');

  // Warm-up render
  scene.render();
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log(`📸 Starting to render 6 views of the model...`);
  console.log(`📹 Final camera state before rendering:`);
  console.log(`   - Alpha: ${camera.alpha.toFixed(3)} rad`);
  console.log(`   - Beta: ${camera.beta.toFixed(3)} rad (${((camera.beta * 180) / Math.PI).toFixed(1)}°)`);
  console.log(`   - Radius: ${camera.radius.toFixed(3)}`);
  console.log(`   - Target: (${camera.target.x.toFixed(2)}, ${camera.target.y.toFixed(2)}, ${camera.target.z.toFixed(2)})`);
  console.log(`   - Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);

  // Render 6 views at different angles
  const images: RenderedImage[] = [];
  const angles =
    customAngles && customAngles.length > 0
      ? customAngles
      : [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];

  for (let i = 0; i < angles.length; i++) {
    const angleInDegrees = ((angles[i] * 180) / Math.PI).toFixed(0);
    console.log(`📷 Capturing view ${i + 1}/6 at angle ${angles[i].toFixed(2)} radians (${angleInDegrees}°)`);

    // Set camera alpha for different angles
    camera.alpha = angles[i];
    camera.getViewMatrix(true); // Force view matrix rebuild
    camera.rebuildAnglesAndRadius(); // Rebuild camera position

    console.log(
      `   Camera updated: alpha=${camera.alpha.toFixed(2)}, position=${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`
    );

    // Render with proper frame cycle
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        engine.beginFrame();
        scene.render();
        engine.endFrame();
        resolve();
      });
    });

    // Wait for frame to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Render one more time
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        engine.beginFrame();
        scene.render();
        engine.endFrame();
        resolve();
      });
    });

    // Final wait before capture
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Capture screenshot directly from canvas as PNG (transparent for AI model)
    const pngDataUrl = canvas.toDataURL('image/png');

    console.log(`✅ View ${i + 1} captured (${pngDataUrl.length} bytes)`);

    images.push({
      dataUrl: pngDataUrl,
      angle: angles[i],
      index: i,
    });
  }

  console.log(`🎉 All ${images.length} views rendered successfully`);

  // Cleanup
  scene.dispose();
  engine.dispose();

  return images;
}

/**
 * Convert data URL to File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Generate JPEG preview with white background from PNG data URL
 * This is used for UI display while keeping PNG with transparency for AI model
 */
export async function generateJpegPreview(pngDataUrl: string, quality: number = 0.95): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas with white background
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the PNG image on top
      ctx.drawImage(img, 0, 0);

      // Convert to JPEG
      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(jpegDataUrl);
    };
    img.src = pngDataUrl;
  });
}
