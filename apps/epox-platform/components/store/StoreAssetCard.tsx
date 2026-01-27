'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Heart,
  Loader2,
  CloudOff,
  MoreVertical,
  Edit3,
  Download,
  CheckCircle2,
  Upload,
  Trash2,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ImageEditorModal } from '@/components/studio/modals/ImageEditorModal';

interface StoreAssetCardProps {
  // Image data
  imageUrl: string;
  imageId: string;
  productId?: string;
  imageType: 'base' | 'generated';

  // Status flags
  isFavorite?: boolean;
  syncStatus?: 'synced' | 'not_synced' | 'pending' | 'failed';
  syncError?: string;
  isSyncing?: boolean;
  isPrimary?: boolean;

  // Callbacks
  onToggleFavorite?: () => void;
  onSync?: () => void;
  onUnsync?: () => void;
  onDelete?: () => void;
  onImageEdited?: () => void;

  testId?: string;
}

export function StoreAssetCard({
  imageUrl,
  imageId,
  productId,
  imageType,
  isFavorite = false,
  syncStatus = 'not_synced',
  syncError,
  isSyncing = false,
  isPrimary = false,
  onToggleFavorite,
  onSync,
  onUnsync,
  onDelete,
  onImageEdited,
  testId,
}: StoreAssetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const canSync = syncStatus === 'not_synced' || syncStatus === 'failed';
  const canUnsync = syncStatus === 'synced';
  const canDelete = syncStatus !== 'synced';

  const handleImageSave = () => {
    onImageEdited?.();
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${imageType}-${imageId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleDeleteClick = () => {
    if (canDelete) {
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    onDelete?.();
    setDeleteDialogOpen(false);
  };

  // Show buttons when hovered or when menu is open
  const showActions = isHovered || menuOpen;

  return (
    <>
      <div
        className={cn(
          'group relative rounded-lg border bg-card overflow-hidden transition-all',
          showActions && 'shadow-md'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={testId}
      >
        {/* Sync Status Indicator - Top Left */}
        {syncStatus === 'synced' && (
          <div className="absolute top-2 left-2 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-5.5 w-5.5 rounded-md bg-green-50 dark:bg-gray-800 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-100" data-testid={`${testId}-synced-indicator`} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Synced to store</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {syncStatus === 'not_synced' && (
          <div className="absolute top-2 left-2 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-5.5 w-5.5 rounded-md bg-muted flex items-center justify-center">
                    <CloudOff className="h-3.5 w-3.5 text-muted-foreground" data-testid={`${testId}-not-synced-indicator`} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Not synced</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Action Menu - Top Right */}
        <div
          className={cn(
            'absolute top-2 right-2 z-10 transition-opacity',
            showActions ? 'opacity-100' : 'opacity-0'
          )}
        >
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-background"
                      data-testid={`${testId}-more-btn`}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>More actions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end">
              {/* Favorite */}
              {onToggleFavorite && (
                <DropdownMenuItem onClick={onToggleFavorite} data-testid={`${testId}-menu-favorite`}>
                  <Heart className={cn("mr-2 h-4 w-4", isFavorite && "fill-red-500 text-red-500")} />
                  {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                </DropdownMenuItem>
              )}

              {/* Download */}
              <DropdownMenuItem onClick={handleDownload} data-testid={`${testId}-menu-download`}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Sync Actions */}
              {canSync && onSync && (
                <DropdownMenuItem
                  onClick={onSync}
                  disabled={isSyncing}
                  data-testid={`${testId}-menu-sync`}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Sync to store
                </DropdownMenuItem>
              )}

              {canUnsync && onUnsync && (
                <DropdownMenuItem
                  onClick={onUnsync}
                  disabled={isSyncing}
                  data-testid={`${testId}-menu-unsync`}
                >
                  <CloudOff className="mr-2 h-4 w-4" />
                  Remove from store
                </DropdownMenuItem>
              )}

              {/* Delete */}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    disabled={!canDelete}
                    className={cn(!canDelete && "opacity-50 cursor-not-allowed", canDelete && "text-destructive")}
                    data-testid={`${testId}-menu-delete`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageType === 'base' ? 'Product image' : 'Generated asset'}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {/* Loading Overlay */}
          {isSyncing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Edit Button - Bottom Right */}
          <div
            className={cn(
              'absolute bottom-2 right-2 z-10 transition-opacity',
              showActions ? 'opacity-100' : 'opacity-0'
            )}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-background"
                    onClick={() => setEditorOpen(true)}
                    disabled={!imageUrl}
                    data-testid={`${testId}-edit-btn`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Primary Badge - Bottom Left */}
          {isPrimary && (
            <div className="absolute bottom-2 left-2 z-10">
              <div className="px-2 py-0.5 rounded text-xs font-medium bg-background/80 backdrop-blur">
                Primary
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Editor Modal */}
      {imageUrl && (
        <ImageEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          imageUrl={imageUrl}
          imageType={imageType}
          imageId={imageId}
          productId={productId}
          onSave={handleImageSave}
          isSyncedWithStore={syncStatus === 'synced'}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid={`${testId}-delete-dialog`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {imageType === 'base' ? 'image' : 'generated asset'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`${testId}-delete-cancel`}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid={`${testId}-delete-confirm`}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
