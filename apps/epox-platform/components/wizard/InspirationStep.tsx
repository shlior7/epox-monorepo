'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Search, ImageIcon, BookmarkIcon, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MAX_INSPIRATION_IMAGES } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { InspirationSourceType } from 'visualizer-types';

interface InspirationStepProps {
  selectedImages: string[];
  onImagesChange: (images: string[]) => void;
  selectedItems?: Array<{ url: string; sourceType: InspirationSourceType }>;
  onSelectedItemsChange?: (items: Array<{ url: string; sourceType: InspirationSourceType }>) => void;
}

interface ExploreImage {
  id: string;
  url: string;
  thumbUrl: string;
  description: string;
  photographer: string;
}

// Room type keywords for exploring interior images
const sceneTypeKeywords = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Dining Room',
  'Office',
  'Bathroom',
  'Outdoor',
  'Modern',
];

export function InspirationStep({
  selectedImages,
  onImagesChange,
  selectedItems,
  onSelectedItemsChange,
}: InspirationStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSources, setSelectedSources] = useState<Record<string, InspirationSourceType>>(() => {
    const initial: Record<string, InspirationSourceType> = {};
    if (selectedItems) {
      for (const item of selectedItems) {
        initial[item.url] = item.sourceType;
      }
    }
    return initial;
  });

  useEffect(() => {
    if (!selectedItems) return;
    setSelectedSources((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const item of selectedItems) {
        if (next[item.url] !== item.sourceType) {
          next[item.url] = item.sourceType;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedItems]);

  useEffect(() => {
    setSelectedSources((prev) => {
      let changed = false;
      const next: Record<string, InspirationSourceType> = {};
      for (const url of selectedImages) {
        if (prev[url]) {
          next[url] = prev[url];
        } else {
          next[url] = 'upload';
          changed = true;
        }
      }
      if (Object.keys(next).length !== Object.keys(prev).length) {
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedImages]);

  useEffect(() => {
    if (!onSelectedItemsChange) return;
    const items = selectedImages.map((url) => ({
      url,
      sourceType: selectedSources[url] ?? 'upload',
    }));
    onSelectedItemsChange(items);
  }, [onSelectedItemsChange, selectedImages, selectedSources]);

  // Fetch explore images (from Unsplash API)
  // Append "interior" to room type searches for better results
  const searchTerm = activeSearch ? `${activeSearch} interior` : 'interior design';
  const { data: exploreData, isLoading: isLoadingExplore } = useQuery({
    queryKey: ['explore', activeSearch],
    queryFn: () => apiClient.searchExplore(searchTerm),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch pinned library images
  const { data: libraryData, isLoading: isLoadingLibrary } = useQuery({
    queryKey: ['pinned-images'],
    queryFn: () => apiClient.listGeneratedImages({ pinned: true }),
  });

  const handleImageSelect = (url: string, sourceType: InspirationSourceType) => {
    if (selectedImages.includes(url)) {
      onImagesChange(selectedImages.filter((img) => img !== url));
      setSelectedSources((prev) => {
        if (!prev[url]) return prev;
        const next = { ...prev };
        delete next[url];
        return next;
      });
    } else if (selectedImages.length < MAX_INSPIRATION_IMAGES) {
      onImagesChange([...selectedImages, url]);
      setSelectedSources((prev) => ({ ...prev, [url]: sourceType }));
    } else {
      toast.error(`Maximum ${MAX_INSPIRATION_IMAGES} images allowed`);
    }
  };

  const removeImage = (url: string) => {
    onImagesChange(selectedImages.filter((img) => img !== url));
    setSelectedSources((prev) => {
      if (!prev[url]) return prev;
      const next = { ...prev };
      delete next[url];
      return next;
    });
  };

  const handleClearAll = () => {
    onImagesChange([]);
    setSelectedSources({});
  };

  const handleSearch = () => {
    setActiveSearch(searchQuery);
  };

  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
    setActiveSearch(keyword);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      await uploadFiles(files);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);

    try {
      const newlyUploadedUrls: string[] = [];

      for (const file of files) {
        const data = await apiClient.uploadFile(file, 'inspiration');
        setUploadedImages((prev) => [...prev, data.url]);
        newlyUploadedUrls.push(data.url);
        toast.success(`Uploaded ${file.name}`);
      }

      // Auto-select uploaded images if there's room
      const availableSlots = MAX_INSPIRATION_IMAGES - selectedImages.length;
      if (availableSlots > 0) {
        const toSelect = newlyUploadedUrls.slice(0, availableSlots);
        onImagesChange([...selectedImages, ...toSelect]);
        setSelectedSources((prev) => {
          const next = { ...prev };
          for (const url of toSelect) {
            next[url] = 'upload';
          }
          return next;
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  // Map explore API response to local format
  const exploreImages: ExploreImage[] = (exploreData?.results || []).map((img: any) => ({
    id: img.id,
    url: img.url,
    thumbUrl: img.thumbUrl,
    description: img.description || '',
    photographer: img.photographer || 'Unknown',
  }));
  const libraryImages = libraryData?.images || [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 sm:mb-6">
        <h2 className="mb-2 text-lg font-semibold sm:text-xl">Choose Inspiration Images</h2>
        <p className="text-muted-foreground">
          Optional: Select up to {MAX_INSPIRATION_IMAGES} images to guide the visual style of your
          generation.
        </p>
      </div>

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-card/50 p-4 sm:mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">
              Selected ({selectedImages.length}/{MAX_INSPIRATION_IMAGES})
            </h3>
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              <X className="mr-1 h-4 w-4" />
              Clear All
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {selectedImages.map((url, index) => (
              <div
                key={url}
                className="group relative h-24 w-32 shrink-0 overflow-hidden rounded-lg"
              >
                <Image src={url} alt="Selected inspiration" fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40" />
                <button
                  onClick={() => removeImage(url)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="explore" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-3 sm:mb-6">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="explore" className="gap-2">
            <Search className="h-4 w-4" />
            Explore
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <BookmarkIcon className="h-4 w-4" />
            My Library
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all sm:p-12',
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card/50 hover:border-primary/50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted sm:h-16 sm:w-16">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <p className="mb-1 font-medium">
                {isUploading ? 'Uploading...' : 'Drag and drop images here'}
              </p>
              <p className="mb-4 text-sm text-muted-foreground">or click to browse</p>
              <p className="text-xs text-muted-foreground">
                Max {MAX_INSPIRATION_IMAGES} images • JPG, PNG, WebP • Max 10MB each
              </p>
            </div>

            {/* Uploaded Images */}
            {uploadedImages.length > 0 && (
              <div>
                <h4 className="mb-3 font-medium">Uploaded ({uploadedImages.length})</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {uploadedImages.map((url) => {
                    const isSelected = selectedImages.includes(url);
                    const canSelect = !isSelected && selectedImages.length < MAX_INSPIRATION_IMAGES;
                    return (
                      <button
                        key={url}
                        onClick={() => handleImageSelect(url, 'upload')}
                        disabled={!canSelect && !isSelected}
                        className={cn(
                          'relative aspect-[4/3] overflow-hidden rounded-lg transition-all',
                          'hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary',
                          isSelected && 'ring-2 ring-primary',
                          !canSelect && !isSelected && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <Image src={url} alt="Uploaded" fill className="object-cover" unoptimized />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                              <ImageIcon className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Explore Tab */}
        <TabsContent value="explore">
          <div className="space-y-4">
            {/* Room Type Keywords */}
            <div className="mb-4 flex flex-wrap gap-2">
              {sceneTypeKeywords.map((keyword) => (
                <Button
                  key={keyword}
                  variant={activeSearch === keyword ? 'default' : 'outline'}
                  className="px-4 py-2 text-sm font-medium"
                  onClick={() => handleKeywordClick(keyword)}
                >
                  {keyword}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput
                placeholder="Search room types..."
                className="flex-1"
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} className="w-full sm:w-auto">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Results */}
            {isLoadingExplore ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {exploreImages.map((image) => {
                  const isSelected = selectedImages.includes(image.url);
                  const canSelect = !isSelected && selectedImages.length < MAX_INSPIRATION_IMAGES;
                  return (
                    <button
                      key={image.id}
                  onClick={() => handleImageSelect(image.url, 'unsplash')}
                      disabled={!canSelect && !isSelected}
                      className={cn(
                        'relative aspect-[4/3] overflow-hidden rounded-lg transition-all',
                        'hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary',
                        isSelected && 'ring-2 ring-primary',
                        !canSelect && !isSelected && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <Image
                        src={image.thumbUrl || image.url}
                        alt={image.description}
                        fill
                        className="object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                            <ImageIcon className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="truncate text-xs text-white">{image.photographer}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library">
          {isLoadingLibrary ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : libraryImages.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BookmarkIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-medium">No pinned images yet</h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Pin your favorite generated images to build a library of reusable inspiration for
                future collections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {libraryImages.map((image: any) => {
                const isSelected = selectedImages.includes(image.url);
                const canSelect = !isSelected && selectedImages.length < MAX_INSPIRATION_IMAGES;
                return (
                  <button
                    key={image.id}
                  onClick={() => handleImageSelect(image.url, 'library')}
                    disabled={!canSelect && !isSelected}
                    className={cn(
                      'relative aspect-[4/3] overflow-hidden rounded-lg transition-all',
                      'hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary',
                      isSelected && 'ring-2 ring-primary',
                      !canSelect && !isSelected && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <Image
                      src={image.url}
                      alt={image.productName || 'Pinned image'}
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                          <ImageIcon className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Skip Note */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have inspiration images? No problem! We&apos;ll use your style tags to generate
          amazing visuals.
        </p>
      </div>
    </div>
  );
}
