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

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);

  // Fetch collections with useQuery - auto-refetches when filter changes
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
    staleTime: 30 * 1000, // Data fresh for 30s
    refetchInterval: statusFilter === 'generating' ? 10 * 1000 : false, // Auto-refresh if viewing generating
    placeholderData: (previousData) => previousData, // Keep old data while fetching
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (collectionId: string) => apiClient.deleteCollection(collectionId),
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
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (collectionToDelete) {
      deleteMutation.mutate(collectionToDelete.id);
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
        actions={
          <Link href="/collections/new">
            <Button variant="glow">
              <Plus className="mr-2 h-4 w-4" />
              New Collection
            </Button>
          </Link>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <SearchInput
            placeholder="Search collections..."
            className="sm:w-80"
            value={searchQuery}
            onSearch={setSearchQuery}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Collections Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="mb-4 h-32 w-full rounded-lg" />
                <Skeleton className="mb-2 h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-destructive">{error instanceof Error ? error.message : 'Failed to load collections'}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Create New Card */}
              <Link href="/collections/new">
                <Card
                  hover
                  className="flex h-full min-h-[200px] flex-col items-center justify-center border-2 border-dashed p-6 text-center"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-medium">Create New Collection</h3>
                  <p className="text-sm text-muted-foreground">Generate images for multiple products</p>
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
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
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
              Are you sure you want to delete "{collectionToDelete?.name}"? This action cannot be
              undone and will remove all generated images associated with this collection.
            </DialogDescription>
          </DialogHeader>
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

  return (
    <Link href={`/collections/${collection.id}`}>
      <Card hover className={cn('overflow-hidden p-0', className)}>
        {/* Thumbnail placeholder */}
        <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-primary/10 via-card to-accent/10">
          <FolderKanban className="h-10 w-10 text-muted-foreground/50" />
          <div className="absolute right-3 top-3" onClick={(e) => e.preventDefault()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-card/80 backdrop-blur">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/collections/${collection.id}`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {collection.status === 'draft' && (
                  <DropdownMenuItem onClick={() => router.push(`/studio/collections/${collection.id}`)}>
                    <Play className="mr-2 h-4 w-4" />
                    Open Studio
                  </DropdownMenuItem>
                )}
                {collection.status === 'completed' && (
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download All
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(collection);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-start justify-between">
            <h3 className="line-clamp-1 font-medium">{collection.name}</h3>
            <Badge variant={statusConfig[collection.status].variant}>
              {statusConfig[collection.status].label}
            </Badge>
          </div>

          <p className="mb-3 text-sm text-muted-foreground">
            {collection.productCount} products •{' '}
            {collection.generatedCount > 0
              ? `${collection.generatedCount}/${collection.totalImages} images`
              : 'Not started'}
          </p>

          {collection.status === 'generating' && (
            <div className="mb-3">
              <Progress value={progress} className="h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
            </div>
          )}

          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1 h-3.5 w-3.5" />
            {formatRelativeTime(new Date(collection.updatedAt))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
