import '@/styles/globals.scss';
import Script from 'next/script';
import { AppProviders } from './AppProviders';
import { isFsDriver, getLocalFsRoot } from '@/lib/services/s3/adapter';
import { resolveS3BucketWithFallback } from '@/lib/services/s3/config';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const runtimeConfig = buildRuntimeConfig();

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Visuals AI - Product Visualizer</title>
        <meta name="description" content="Your creative partner for generating stunning product visuals with AI-powered scene design." />
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('scenergy-theme');
                  if (stored === 'light' || stored === 'dark') {
                    document.documentElement.setAttribute('data-theme', stored);
                  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Script id="s3-runtime-config" strategy="beforeInteractive">{`
          window.__SCENERGY_S3_RUNTIME__ = ${JSON.stringify(runtimeConfig)};
        `}</Script>
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

function buildRuntimeConfig() {
  const driver = isFsDriver ? 'fs' : 'aws';

  if (driver === 'fs') {
    const localDir = process.env.NEXT_PUBLIC_LOCAL_S3_DIR || getLocalFsRoot() || '/.local-s3';
    const publicUrl = process.env.NEXT_PUBLIC_LOCAL_STORAGE_URL;
    return { driver, localDir, publicUrl: publicUrl || undefined };
  }

  // Try direct env vars first, then fall back to resolveS3BucketWithFallback
  const bucket =
    process.env.NEXT_PUBLIC_S3_BUCKET_NAME ||
    process.env.S3_BUCKET ||
    process.env.NEXT_PUBLIC_R2_BUCKET ||
    process.env.R2_BUCKET ||
    process.env.NEXT_PUBLIC_TESTING_S3_BUCKET_NAME ||
    resolveS3BucketWithFallback();

  const publicUrl = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  return { driver, bucket, publicUrl: publicUrl || undefined };
}
