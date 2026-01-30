'use client';

import { useState } from 'react';
import { Bug, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AssetDebugInfo {
  assetId: string;
  prompt: string | null;
  settings: Record<string, unknown> | null;
  jobId: string | null;
  productId: string;
  productName: string;
  baseImageUrls?: string[];
  inspirationImageUrls?: string[];
  flowSettings?: Record<string, unknown> | null;
  collectionSettings?: unknown;
}

interface AssetDebugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debugInfo: AssetDebugInfo;
  testId?: string;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 gap-1 px-2 text-xs"
      onClick={handleCopy}
      data-testid="debug-copy-button"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label || 'Copy'}
        </>
      )}
    </Button>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        className="flex w-full items-center gap-2 py-2 text-left text-sm font-medium text-foreground hover:text-foreground/80"
        onClick={() => setIsOpen(!isOpen)}
        data-testid={`debug-section-${title.toLowerCase().replace(/\s/g, '-')}`}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {title}
      </button>
      {isOpen && <div className="pb-3 pl-5">{children}</div>}
    </div>
  );
}

export function AssetDebugModal({
  open,
  onOpenChange,
  debugInfo,
  testId,
}: AssetDebugModalProps) {
  const {
    assetId,
    prompt,
    settings,
    jobId,
    productId,
    productName,
    baseImageUrls,
    inspirationImageUrls,
    flowSettings,
    collectionSettings,
  } = debugInfo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
        data-testid={testId || 'asset-debug-modal'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-amber-500" />
            Generation Debug Info
          </DialogTitle>
          <DialogDescription>
            {productName} — Asset {assetId?.slice(0, 12)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {/* Prompt */}
          <CollapsibleSection title="Prompt" defaultOpen>
            {prompt ? (
              <div className="relative">
                <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed text-foreground">
                  {prompt}
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton text={prompt} />
                </div>
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">No prompt recorded</p>
            )}
          </CollapsibleSection>

          {/* Settings */}
          <CollapsibleSection title="Generation Settings" defaultOpen>
            {settings ? (
              <div className="space-y-2">
                {(() => {
                  const s = settings as Record<string, string>;
                  return (
                    <div className="flex flex-wrap gap-2">
                      {s.aspectRatio && (
                        <Badge variant="outline" className="text-xs">
                          Aspect: {s.aspectRatio}
                        </Badge>
                      )}
                      {s.imageQuality && (
                        <Badge variant="outline" className="text-xs">
                          Quality: {s.imageQuality}
                        </Badge>
                      )}
                      {s.imageModel && (
                        <Badge variant="outline" className="text-xs">
                          Model: {s.imageModel}
                        </Badge>
                      )}
                    </div>
                  );
                })()}
                <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">No settings recorded</p>
            )}
          </CollapsibleSection>

          {/* Product Images */}
          {baseImageUrls && baseImageUrls.length > 0 && (
            <CollapsibleSection title={`Product Images (${baseImageUrls.length})`}>
              <div className="flex flex-wrap gap-2">
                {baseImageUrls.map((url, i) => (
                  <div
                    key={i}
                    className="relative h-16 w-16 overflow-hidden rounded-md border border-border"
                  >
                    <Image
                      src={url}
                      alt={`Product ref ${i + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Inspiration Images */}
          {inspirationImageUrls && inspirationImageUrls.length > 0 && (
            <CollapsibleSection title={`Inspiration Images (${inspirationImageUrls.length})`}>
              <div className="flex flex-wrap gap-2">
                {inspirationImageUrls.map((url, i) => (
                  <div
                    key={i}
                    className="relative h-16 w-16 overflow-hidden rounded-md border border-border"
                  >
                    <Image
                      src={url}
                      alt={`Inspiration ${i + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Flow Settings */}
          {flowSettings && (
            <CollapsibleSection title="Flow Settings">
              <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground">
                {JSON.stringify(flowSettings, null, 2)}
              </pre>
            </CollapsibleSection>
          )}

          {/* Collection Settings */}
          {collectionSettings != null && typeof collectionSettings === 'object' ? (
            <CollapsibleSection title="Collection Settings">
              <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground">
                {JSON.stringify(collectionSettings, null, 2)}
              </pre>
            </CollapsibleSection>
          ) : null}

          {/* IDs */}
          <CollapsibleSection title="IDs & Tracing">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Asset ID</span>
                <code className="rounded bg-muted/50 px-2 py-0.5 font-mono">{assetId}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Product ID</span>
                <code className="rounded bg-muted/50 px-2 py-0.5 font-mono">{productId}</code>
              </div>
              {jobId && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Job ID</span>
                  <code className="rounded bg-muted/50 px-2 py-0.5 font-mono">{jobId}</code>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Debug icon button to show on asset cards when debug mode is active */
export function DebugIconButton({
  onClick,
  className,
  testId,
}: {
  onClick: () => void;
  className?: string;
  testId?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-7 w-7 rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Debug info"
      data-testid={testId || 'debug-icon-button'}
    >
      <Bug className="h-3.5 w-3.5" />
    </Button>
  );
}
