'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Settings2 } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import type { GeneratedAsset } from '@/lib/api-client';
import type { InspirationImage } from 'visualizer-types';
import {
  type AssetConfiguration,
  AssetCardWrapper,
  AssetCardHeader,
  AssetCardContent,
  ImageThumbnail,
  InspirationStack,
  ConfigBadges,
  StatusBadges,
  AssetActionBar,
  VideoOverlay,
} from './AssetCardContent';
import { AssetCardFooter } from './AssetCardFooter';

interface AssetCardProps {
  asset: GeneratedAsset;
  baseImage?: { url: string; name?: string };
  inspirationImages?: InspirationImage[];
  configuration?: AssetConfiguration;
  onPin?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  isPinned?: boolean;
  isApproved?: boolean;
  isRejected?: boolean;
  className?: string;
  testId?: string;
}

export function AssetCard({
  asset,
  baseImage,
  inspirationImages = [],
  configuration,
  onPin,
  onApprove,
  onReject,
  onDownload,
  onDelete,
  isPinned = false,
  isApproved = false,
  isRejected = false,
  className,
  testId,
}: AssetCardProps) {
  console.log(asset);
  const [isPlaying, setIsPlaying] = useState(false);
  const isVideo = asset.assetType === 'video';

  const handlePlayVideo = () => {
    const video = document.querySelector(`video[src="${asset.url}"]`) as HTMLVideoElement;
    video?.play();
  };

  return (
    <AssetCardWrapper className={className} testId={testId}>
      {/* Header */}
      <AssetCardHeader testId={buildTestId(testId, 'header')}>
        {/* Base Image Thumbnail */}
        {baseImage?.url && (
          <ImageThumbnail
            src={baseImage.url}
            alt={baseImage.name || 'Base image'}
            testId={buildTestId(testId, 'base-image')}
          />
        )}

        {/* Inspiration Images */}
        {inspirationImages.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <InspirationStack
              images={inspirationImages}
              testId={buildTestId(testId, 'inspiration')}
            />
          </>
        )}

        {/* Config and Status */}
        <div className="ml-auto flex items-center gap-2" data-testid={buildTestId(testId, 'meta')}>
          <ConfigBadges configuration={configuration} testId={buildTestId(testId, 'config')} />
          <StatusBadges
            isPinned={isPinned}
            isApproved={isApproved}
            isRejected={isRejected}
            testId={buildTestId(testId, 'status')}
          />
        </div>
      </AssetCardHeader>

      {/* Content */}
      <AssetCardContent aspectRatio={asset.settings?.aspectRatio} testId={buildTestId(testId, 'content')}>
        {isVideo ? (
          <div className="relative h-full w-full">
            <video
              src={asset.url}
              className="h-full w-full object-contain"
              controls={isPlaying}
              muted
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            <VideoOverlay isPlaying={isPlaying} onPlay={handlePlayVideo} />
          </div>
        ) : (
          <Image
            src={asset.url}
            alt="Generated image"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain"
            unoptimized
          />
        )}
      </AssetCardContent>

      {/* Footer */}
      <AssetCardFooter testId={buildTestId(testId, 'footer')}>
        <AssetActionBar
          isPinned={isPinned}
          isApproved={isApproved}
          onPin={onPin}
          onApprove={onApprove}
          onReject={onReject}
          onDownload={onDownload}
          onDelete={onDelete}
          testId={buildTestId(testId, 'actions')}
        />
      </AssetCardFooter>
    </AssetCardWrapper>
  );
}
