import type { ApprovalStatus, AssetStatus } from '@/lib/types';
import type { Check, Clock, Loader2, X } from 'lucide-react';
import type { ImageAspectRatio } from 'visualizer-types';

export interface Revision {
  id: string;
  imageUrl: string;
  timestamp: Date;
  prompt?: string;
  type: 'original' | 'generated' | 'edited';
  isVideo?: boolean;
  aspectRatio?: ImageAspectRatio;
  isFavorite?: boolean;
}

export interface BaseImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface FlowCardBaseProps {
  flowId: string;
  collectionId: string;
  product: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
  };
  baseImages: BaseImage[];
  selectedBaseImageId: string;
  revisions: Revision[];
  status: AssetStatus;
  approvalStatus: ApprovalStatus;
  isPinned: boolean;
  sceneType?: string;
  availableSceneTypes?: string[];
  onChangeBaseImage?: (baseImageId: string) => void;
  onChangeSceneType?: (sceneType: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDeleteRevision?: (revisionId: string) => void;
  onImageEdited?: (
    revisionId: string,
    result: {
      mode: 'overwrite' | 'copy';
      imageDataUrl: string;
      imageUrl?: string;
      assetId?: string;
    }
  ) => void;
  onGenerate?: () => void;
  onOpenStudio?: () => void;
  onOpenProductDetails?: () => void;
  onFavorite?: (revisionId: string) => void;
  onSync?: () => void;
  debugMode?: boolean;
  onDebug?: (revisionId: string) => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
  testId?: string;
}

export type StatusConfigEntry = {
  label: string;
  icon: typeof Clock | typeof Loader2 | typeof Check | typeof X;
  className: string;
};

export const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  pending: { label: 'Queued', className: 'text-muted-foreground' },
  generating: { label: 'Generating', className: 'text-warning animate-spin' },
  completed: { label: 'Completed', className: 'text-success' },
  error: { label: 'Error', className: 'text-destructive' },
};

export const approvalConfig: Record<
  ApprovalStatus,
  { label: string; variant: 'default' | 'success' | 'destructive' | 'muted' }
> = {
  pending: { label: 'Pending', variant: 'muted' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export const DEFAULT_SCENE_TYPES = [
  'Living Room',
  'Bedroom',
  'Office',
  'Kitchen',
  'Dining Room',
  'Outdoor',
  'Studio',
];
