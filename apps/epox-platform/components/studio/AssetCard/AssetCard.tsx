'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Settings2 } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
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
}: AssetCardProps) {
  console.log(asset)
  const [isPlaying, setIsPlaying] = useState(false);
  const isVideo = asset.assetType === 'video';

  const handlePlayVideo = () => {
    const video = document.querySelector(`video[src="${asset.url}"]`) as HTMLVideoElement;
    video?.play();
  };

  return (
    <AssetCardWrapper className={className}>
      {/* Header */}
      <AssetCardHeader>
        {/* Base Image Thumbnail */}
        {baseImage?.url && (
          <ImageThumbnail src={baseImage.url} alt={baseImage.name || 'Base image'} />
        )}

        {/* Inspiration Images */}
        {inspirationImages.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <InspirationStack images={inspirationImages} />
          </>
        )}

        {/* Config and Status */}
        <div className="ml-auto flex items-center gap-2">
          <ConfigBadges configuration={configuration} />
          <StatusBadges isPinned={isPinned} isApproved={isApproved} isRejected={isRejected} />
        </div>
      </AssetCardHeader>

      {/* Content */}
      <AssetCardContent aspectRatio={asset.settings?.aspectRatio}>
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
            className="object-contain"
            unoptimized
          />
        )}
      </AssetCardContent>

      {/* Footer */}
      <AssetCardFooter>
        <AssetActionBar
          isPinned={isPinned}
          isApproved={isApproved}
          onPin={onPin}
          onApprove={onApprove}
          onReject={onReject}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </AssetCardFooter>
    </AssetCardWrapper>
  );
}
