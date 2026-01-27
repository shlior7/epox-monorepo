'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Image as ImageIcon, Search, Check, Loader2 } from 'lucide-react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { ReferenceBubbleValue, InspirationImage } from 'visualizer-types';

// ===== TABS =====

type PickerTab = 'upload' | 'library' | 'unsplash';

// ===== PROPS =====

export interface InspirationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: ReferenceBubbleValue) => void;
  currentValue?: ReferenceBubbleValue;
  onUpload?: (file: File) => Promise<string>; // Returns uploaded URL
}

// ===== COMPONENT =====

export function InspirationPickerModal({
  open,
  onOpenChange,
  onSelect,
  currentValue,
  onUpload,
}: InspirationPickerModalProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('upload');
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [selectedLibraryImage, setSelectedLibraryImage] = useState<string | null>(null);

  // Handle file upload
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onUpload) return;

      setIsUploading(true);
      try {
        const url = await onUpload(file);
        setUploadedUrl(url);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  // Handle selection
  const handleSelect = () => {
    let image: InspirationImage | undefined;

    if (activeTab === 'upload' && uploadedUrl) {
      image = {
        url: uploadedUrl,
        addedAt: new Date().toISOString(),
        sourceType: 'upload',
      };
    } else if (activeTab === 'library' && selectedLibraryImage) {
      image = {
        url: selectedLibraryImage,
        addedAt: new Date().toISOString(),
        sourceType: 'library',
      };
    }

    if (image) {
      const value: ReferenceBubbleValue = {
        type: 'reference',
        image,
      };
      onSelect(value);
      onOpenChange(false);
    }
  };

  const canSelect =
    (activeTab === 'upload' && uploadedUrl) ||
    (activeTab === 'library' && selectedLibraryImage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        testId={buildTestId('inspiration-picker-modal')}
      >
        <DialogHeader>
          <DialogTitle>Add Inspiration Image</DialogTitle>
          <DialogDescription>
            Upload an image or select from your library
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div
          className="flex gap-1 rounded-lg bg-muted/50 p-1"
          data-testid={buildTestId('inspiration-picker-modal', 'tabs')}
        >
          {(['upload', 'library', 'unsplash'] as PickerTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              data-testid={buildTestId('inspiration-picker-modal', 'tab', tab)}
            >
              {tab === 'upload' && 'Upload'}
              {tab === 'library' && 'Library'}
              {tab === 'unsplash' && 'Unsplash'}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="py-4" data-testid={buildTestId('inspiration-picker-modal', 'upload-tab')}>
            {uploadedUrl ? (
              <div className="relative mx-auto aspect-video max-w-sm overflow-hidden rounded-lg border">
                <Image src={uploadedUrl} alt="Uploaded" fill className="object-cover" />
                <button
                  onClick={() => setUploadedUrl(null)}
                  className="absolute right-2 top-2 rounded-md bg-background/80 px-2 py-1 text-xs hover:bg-background"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                  isUploading
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isUploading}
                />
                {isUploading ? (
                  <>
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop an image here</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      or click to browse
                    </p>
                  </>
                )}
              </label>
            )}
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="py-4" data-testid={buildTestId('inspiration-picker-modal', 'library-tab')}>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search your images..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border">
              <div className="text-center">
                <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Your image library will appear here
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unsplash Tab */}
        {activeTab === 'unsplash' && (
          <div className="py-4" data-testid={buildTestId('inspiration-picker-modal', 'unsplash-tab')}>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search Unsplash..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border">
              <div className="text-center">
                <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Search Unsplash for inspiration images
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!canSelect}>
            Add Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
