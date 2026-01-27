// components/SafeNextImage.tsx
'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface SafeNextImageProps extends ImageProps {
  onSafeClick?: (url: ImageProps['src']) => void;
  fallbackSrc?: string;
}

export function SafeNextImage({ src, fallbackSrc, alt, width, height, onSafeClick, ...props }: SafeNextImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // If no valid src after error, don't render the image
  if (hasError && !currentSrc) {
    return null;
  }

  return (
    <Image
      {...props}
      src={currentSrc || '/placeholder.png'}
      alt={alt}
      onClick={(e) => {
        if (onSafeClick) {
          onSafeClick?.(currentSrc);
        } else {
          props.onClick?.(e);
        }
      }}
      onError={(e) => {
        e.preventDefault?.();
        e.stopPropagation?.();
        setHasError(true);
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        } else if (!fallbackSrc) {
          setCurrentSrc('');
        }
      }}
      width={width}
      height={height}
      loading={props.loading ?? 'lazy'}
      decoding="async"
      unoptimized={props.unoptimized ?? false}
      priority={props.priority ?? false}
    />
  );
}
