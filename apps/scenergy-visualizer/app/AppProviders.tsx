'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import { DataProvider } from '@/lib/contexts/DataContext';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { AppShell } from '@/components/AppShell';
import { ToastContainer } from '@/components/ToastContainer';
import { ConfirmDialog } from '@/components/ConfirmDialog';

declare global {
  interface Window {
    BABYLON: any;
    __BJS_LOADERS_REGISTERED__?: boolean;
    __BJS_LOADERS_CHECKED__?: boolean;
    __SCENERGY_S3_RUNTIME__?: {
      driver: 'aws' | 'fs';
      localDir?: string;
      bucket?: string;
      publicUrl?: string;
    };
  }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const config = window.__SCENERGY_S3_RUNTIME__;
      if (config?.driver === 'fs') {
        console.info(`🔧 S3 Driver: local filesystem (${config.localDir || 'unknown path'})`);
      } else if (config?.driver === 'aws') {
        console.info(`☁️ S3 Driver: AWS bucket (${config.bucket || 'unknown bucket'})`);
      } else {
        console.warn('S3 driver configuration unavailable.');
      }
    }

    const initLoaders = () => {
      const { BABYLON } = window;
      if (!BABYLON) {
        return;
      }

      const isPluginRegistered =
        typeof BABYLON.SceneLoader?.IsPluginRegistered === 'function' &&
        (BABYLON.SceneLoader.IsPluginRegistered('gltf') || BABYLON.SceneLoader.IsPluginRegistered('glb'));

      const hasGLTFLoaderClass = typeof BABYLON.GLTFFileLoader === 'function';

      if (isPluginRegistered || hasGLTFLoaderClass) {
        window.__BJS_LOADERS_REGISTERED__ = true;
        return;
      }

      if (!window.__BJS_LOADERS_REGISTERED__ && !window.__BJS_LOADERS_CHECKED__) {
        window.__BJS_LOADERS_CHECKED__ = true;
        try {
          registerBuiltInLoaders();
          window.__BJS_LOADERS_REGISTERED__ = true;
        } catch (error) {
          console.error('Failed to register Babylon loaders', error);
          window.__BJS_LOADERS_REGISTERED__ = false;
        } finally {
          window.__BJS_LOADERS_CHECKED__ = false;
        }
      }
    };

    if (document.readyState === 'complete') {
      initLoaders();
    }

    window.addEventListener('load', initLoaders);

    return () => {
      window.removeEventListener('load', initLoaders);
    };
  }, []);

  return (
    <>
      <ThemeProvider defaultTheme="dark">
        <DataProvider>
          <AppShell>{children}</AppShell>
          <ToastContainer />
          <ConfirmDialog />
        </DataProvider>
      </ThemeProvider>
      <Script src="https://cdn.babylonjs.com/babylon.js" strategy="beforeInteractive" />
      <Script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js" strategy="beforeInteractive" />
    </>
  );
}
