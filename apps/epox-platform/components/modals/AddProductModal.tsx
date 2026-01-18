'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  X,
  ImagePlus,
  Package,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { apiClient, type Product } from '@/lib/api-client';
import { toast } from 'sonner';

const SCENE_TYPES = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Office',
  'Dining Room',
  'Outdoor',
  'Entryway',
];

const CATEGORIES = [
  'Furniture',
  'Lighting',
  'Decor',
  'Textiles',
  'Storage',
  'Outdoor',
  'Kitchen',
  'Bath',
];

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded?: (product: Product) => void;
}

type Step = 'upload' | 'details';

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

export function AddProductModal({ isOpen, onClose, onProductAdded }: AddProductModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState<Step>('upload');

  // Upload state
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedsceneTypes, setSelectedsceneTypes] = useState<string[]>([]);
  const [price, setPrice] = useState('');

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep('upload');
    setFiles([]);
    setName('');
    setSku('');
    setCategory('');
    setDescription('');
    setSelectedsceneTypes([]);
    setPrice('');
    setUploadProgress(0);
    onClose();
  }, [onClose]);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async () => {
      // First create the product
      const product = await apiClient.createProduct({
        name,
        sku: sku || undefined,
        category: category || undefined,
        sceneTypes: selectedsceneTypes.length > 0 ? selectedsceneTypes : undefined,
        price: price ? parseFloat(price) : undefined,
        description: description || undefined,
      });

      // Then upload images if any
      if (files.length > 0) {
        setUploadProgress(10);
        const progressPerFile = 80 / files.length;

        for (let i = 0; i < files.length; i++) {
          await apiClient.uploadFile(files[i].file, 'product', { productId: product.id });
          setUploadProgress(10 + (i + 1) * progressPerFile);
        }
      }

      setUploadProgress(100);
      return product;
    },
    onSuccess: (product) => {
      toast.success('Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onProductAdded?.(product);
      handleClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
      setUploadProgress(0);
    },
  });

  // File handling
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithPreview[] = Array.from(selectedFiles)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: `${file.name}-${Date.now()}-${Math.random()}`,
      }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const togglesceneType = useCallback((room: string) => {
    setSelectedsceneTypes((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  }, []);

  // Validation
  const canProceedToDetails = files.length > 0;
  const canSubmit = name.trim().length > 0;

  const isSubmitting = createProductMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        {/* Progress indicator */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setStep('upload')}
            className={cn(
              'flex flex-1 items-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
              step === 'upload' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                step === 'upload'
                  ? 'bg-primary text-primary-foreground'
                  : files.length > 0
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {files.length > 0 && step !== 'upload' ? <Check className="h-3 w-3" /> : '1'}
            </div>
            Upload Images
          </button>
          <button
            type="button"
            onClick={() => canProceedToDetails && setStep('details')}
            disabled={!canProceedToDetails}
            className={cn(
              'flex flex-1 items-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
              step === 'details' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
              !canProceedToDetails && 'cursor-not-allowed opacity-50'
            )}
          >
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                step === 'details'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              2
            </div>
            Product Details
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' ? (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Product Images
                </DialogTitle>
                <DialogDescription>
                  Add photos of your product from different angles. We&apos;ll use these to generate
                  stunning lifestyle images.
                </DialogDescription>
              </DialogHeader>

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-xl transition-colors',
                      isDragging ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    )}
                  >
                    <ImagePlus className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {isDragging ? 'Drop images here' : 'Drag images here or click to browse'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      PNG, JPG up to 10MB each
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview grid */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{files.length} image(s) selected</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        files.forEach((f) => URL.revokeObjectURL(f.preview));
                        setFiles([]);
                      }}
                    >
                      Clear all
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {files.map((file, index) => (
                      <div
                        key={file.id}
                        className={cn(
                          'group relative aspect-square overflow-hidden rounded-lg border',
                          index === 0 && 'ring-2 ring-primary ring-offset-2'
                        )}
                      >
                        <Image
                          src={file.preview}
                          alt={file.file.name}
                          fill
                          className="object-cover"
                        />
                        {index === 0 && (
                          <div className="absolute left-1 top-1">
                            <Badge variant="default" className="text-[10px]">
                              Primary
                            </Badge>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Product Details
                </DialogTitle>
                <DialogDescription>
                  Tell us about your product. This helps generate better images.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Product Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Modern Oak Coffee Table"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SKU</label>
                    <Input
                      placeholder="e.g., TBL-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <Badge
                        key={cat}
                        variant={category === cat ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setCategory(category === cat ? '' : cat)}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Room Types</label>
                  <div className="flex flex-wrap gap-2">
                    {SCENE_TYPES.map((room) => (
                      <Badge
                        key={room}
                        variant={selectedsceneTypes.includes(room) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => togglesceneType(room)}
                      >
                        {selectedsceneTypes.includes(room) && <Check className="mr-1 h-3 w-3" />}
                        {room}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Brief description of your product..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {isSubmitting && uploadProgress > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {uploadProgress < 100 ? 'Uploading...' : 'Complete!'}
                </span>
                <span className="font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-6 py-4">
          {step === 'upload' ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('details')}
                disabled={!canProceedToDetails}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="glow"
                onClick={() => createProductMutation.mutate()}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Product
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

