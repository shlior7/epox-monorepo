'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Filter,
  Clock,
  FolderKanban,
  MoreVertical,
  Trash2,
  Edit,
  Play,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/spinner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CollectionThumbnailGrid } from '@/components/collections/CollectionThumbnailGrid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout';
import { formatRelativeTime, cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { toast } from 'sonner';
import type { CollectionSessionStatus } from '@/lib/types';
import { apiClient, type Collection } from '@/lib/api-client';

const statusConfig: Record<
  CollectionSessionStatus,
  { label: string; variant: 'muted' | 'secondary' | 'warning' | 'success' | 'destructive' }
> = {
  draft: { label: 'Draft', variant: 'muted' },
  generating: { label: 'Generating', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
};

export function CollectionsClient() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [deleteAssetPolicy, setDeleteAssetPolicy] = useState<'delete_all' | 'keep_pinned_approved'>(
    'keep_pinned_approved'
  );

  // Fetch collections - will use prefetched data if available
  const {
    data: collectionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['collections', { status: statusFilter }],
    queryFn: () =>
      apiClient.listCollections({
        status: statusFilter as 'all' | 'draft' | 'generating' | 'completed',
        limit: 50,
      }),
    staleTime: 30 * 1000,
    refetchInterval: statusFilter === 'generating' ? 10 * 1000 : false,
    placeholderData: (previousData) => previousData,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string; assetPolicy: 'delete_all' | 'keep_pinned_approved' }) =>
      apiClient.deleteCollection(payload.id, { assetPolicy: payload.assetPolicy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection deleted successfully');
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete collection');
    },
  });

  const handleDeleteClick = (collection: Collection) => {
    setCollectionToDelete(collection);
    setDeleteAssetPolicy('keep_pinned_approved');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (collectionToDelete) {
      deleteMutation.mutate({ id: collectionToDelete.id, assetPolicy: deleteAssetPolicy });
    }
  };

  const collections = collectionsData?.collections ?? [];
  const filteredCollections = collections.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      <PageHeader
        title="Collections"
        description="Manage your product visualization collections"
        testId="collections-header"
        actions={
          <Link href="/collections/new">
            <Button variant="glow" testId="collections-new-button">
              <Plus className="mr-2 h-4 w-4" />
              New Collection
            </Button>
          </Link>
        }
      />

      <div className="p-8" data-testid="collections-page">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row" data-testid="collections-filters">
          <SearchInput
            placeholder="Search collections..."
            className="sm:w-80"
            value={searchQuery}
            onSearch={setSearchQuery}
            testId="collections-search"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" testId="collections-status-trigger">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent testId="collections-status-content">
              <SelectItem value="all" testId={buildTestId('collections-status', 'all')}>
                All Status
              </SelectItem>
              <SelectItem value="draft" testId={buildTestId('collections-status', 'draft')}>
                Draft
              </SelectItem>
              <SelectItem
                value="generating"
                testId={buildTestId('collections-status', 'generating')}
              >
                Generating
              </SelectItem>
              <SelectItem value="completed" testId={buildTestId('collections-status', 'completed')}>
                Completed
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Collections Grid */}
        {isLoading ? (
          <div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            data-testid="collections-loading"
          >
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="p-6"
                testId={buildTestId('collections-loading', `item-${i}`)}
              >
                <Skeleton
                  className="mb-4 h-32 w-full rounded-lg"
                  testId={buildTestId('collections-loading', `item-${i}`, 'image')}
                />
                <Skeleton
                  className="mb-2 h-5 w-3/4"
                  testId={buildTestId('collections-loading', `item-${i}`, 'title')}
                />
                <Skeleton
                  className="h-4 w-1/2"
                  testId={buildTestId('collections-loading', `item-${i}`, 'meta')}
                />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center" data-testid="collections-error">
            <p
              className="mb-4 text-destructive"
              data-testid={buildTestId('collections-error', 'message')}
            >
              {error instanceof Error ? error.message : 'Failed to load collections'}
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              testId={buildTestId('collections-error', 'retry')}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              data-testid="collections-grid"
            >
              {/* Create New Card */}
              <Link href="/collections/new">
                <Card
                  hover
                  className="flex h-full min-h-[200px] flex-col items-center justify-center border-2 border-dashed p-6 text-center"
                  testId="collections-create-card"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-medium">Create New Collection</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate images for multiple products
                  </p>
                </Card>
              </Link>

              {/* Collection Cards */}
              {filteredCollections.map((collection, index) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onDelete={handleDeleteClick}
                  className={cn('animate-fade-in opacity-0', `stagger-${index + 1}`)}
                />
              ))}
            </div>

            {filteredCollections.length === 0 && searchQuery && (
              <div className="py-12 text-center" data-testid="collections-empty">
                <p
                  className="text-muted-foreground"
                  data-testid={buildTestId('collections-empty', 'message')}
                >
                  No collections found matching &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              Choose what to do with assets created by "{collectionToDelete?.name}". This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={deleteAssetPolicy}
            onValueChange={(value) =>
              setDeleteAssetPolicy(value as 'delete_all' | 'keep_pinned_approved')
            }
            className="space-y-3"
          >
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <RadioGroupItem id="delete-collection-assets" value="delete_all" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="delete-collection-assets">
                  Remove all assets in this collection
                </Label>
                <p className="text-xs text-muted-foreground">
                  Deletes every generated asset owned by this collection.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <RadioGroupItem
                id="keep-collection-assets"
                value="keep_pinned_approved"
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="keep-collection-assets">Keep pinned and approved assets</Label>
                <p className="text-xs text-muted-foreground">
                  Only deletes assets that are not pinned and not approved.
                </p>
              </div>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCollectionToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CollectionCard({
  collection,
  className,
  onDelete,
}: {
  collection: Collection;
  className?: string;
  onDelete: (collection: Collection) => void;
}) {
  const router = useRouter();
  const progress =
    collection.totalImages > 0 ? (collection.generatedCount / collection.totalImages) * 100 : 0;
  const collectionTestId = buildTestId('collection-card', collection.id);

  return (
    <Link href={`/studio/collections/${collection.id}`}>
      <Card hover className={cn('overflow-hidden p-0', className)} testId={collectionTestId}>
        {/* Thumbnail grid */}
        <div
          className="relative flex h-32 items-center justify-center bg-gradient-to-br from-primary/10 via-card to-accent/10"
          data-testid={buildTestId(collectionTestId, 'thumbnail')}
        >
          <CollectionThumbnailGrid thumbnails={collection.thumbnails ?? []} />
          <div
            className="absolute right-3 top-3"
            onClick={(e) => e.preventDefault()}
            data-testid={buildTestId(collectionTestId, 'menu')}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-card/80 backdrop-blur"
                  testId={buildTestId(collectionTestId, 'menu', 'trigger')}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                testId={buildTestId(collectionTestId, 'menu', 'content')}
              >
                <DropdownMenuItem
                  onClick={() => router.push(`/collections/${collection.id}`)}
                  testId={buildTestId(collectionTestId, 'menu', 'edit')}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push(`/studio/collections/${collection.id}`)}
                  testId={buildTestId(collectionTestId, 'menu', 'open-studio')}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Open Studio
                </DropdownMenuItem>
                {collection.status === 'completed' && (
                  <DropdownMenuItem testId={buildTestId(collectionTestId, 'menu', 'download')}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator
                  testId={buildTestId(collectionTestId, 'menu', 'separator')}
                />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(collection);
                  }}
                  testId={buildTestId(collectionTestId, 'menu', 'delete')}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-4" data-testid={buildTestId(collectionTestId, 'content')}>
          <div className="mb-2 flex items-start justify-between">
            <h3
              className="line-clamp-1 font-medium"
              data-testid={buildTestId(collectionTestId, 'name')}
            >
              {collection.name}
            </h3>
            {collection.status === 'generating' && (
              <Badge
                variant={statusConfig[collection.status].variant}
                testId={buildTestId(collectionTestId, 'status')}
              >
                {statusConfig[collection.status].label}
              </Badge>
            )}
          </div>

          <p
            className="mb-3 text-sm text-muted-foreground"
            data-testid={buildTestId(collectionTestId, 'meta')}
          >
            {collection.productCount} products •{' '}
            {collection.generatedCount > 0
              ? `${collection.generatedCount}/${collection.totalImages} images`
              : 'Not started'}
          </p>

          {collection.status === 'generating' && (
            <div className="mb-3" data-testid={buildTestId(collectionTestId, 'progress')}>
              <Progress
                value={progress}
                className="h-1.5"
                testId={buildTestId(collectionTestId, 'progress', 'bar')}
              />
              <p
                className="mt-1 text-xs text-muted-foreground"
                data-testid={buildTestId(collectionTestId, 'progress', 'label')}
              >
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          <div
            className="flex items-center text-xs text-muted-foreground"
            data-testid={buildTestId(collectionTestId, 'updated')}
          >
            <Clock className="mr-1 h-3.5 w-3.5" />
            {formatRelativeTime(new Date(collection.updatedAt))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
