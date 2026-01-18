'use client';

import Link from 'next/link';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Progress } from './progress';
import { Eye, Download, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface SessionCardProps {
  session: {
    id: string;
    name: string;
    status: 'draft' | 'generating' | 'completed';
    productCount: number;
    generatedCount: number;
    totalImages: number;
    updatedAt: Date | string;
    thumbnailUrl?: string;
  };
  onDelete?: (id: string) => void;
  className?: string;
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const },
  generating: { label: 'Generating...', variant: 'warning' as const },
  completed: { label: 'Completed', variant: 'success' as const },
};

export function SessionCard({ session, onDelete, className }: SessionCardProps) {
  const statusInfo = statusConfig[session.status];
  const progress =
    session.totalImages > 0 ? Math.round((session.generatedCount / session.totalImages) * 100) : 0;

  return (
    <Card className={cn('group overflow-hidden transition-all hover:border-primary/30', className)}>
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted/50">
          {session.thumbnailUrl ? (
            <img
              src={session.thumbnailUrl}
              alt={session.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
              🎨
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/collections/${session.id}`}
                className="line-clamp-1 font-medium transition-colors hover:text-primary"
              >
                {session.name}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {session.productCount} products • Updated {formatRelativeTime(session.updatedAt)}
              </p>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>

          {/* Progress bar for generating */}
          {session.status === 'generating' && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>
                  {session.generatedCount}/{session.totalImages} images
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Completed stats */}
          {session.status === 'completed' && (
            <p className="mt-2 text-sm text-muted-foreground">
              {session.generatedCount} images generated
            </p>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            {session.status === 'completed' && (
              <>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/collections/${session.id}`}>
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    View Results
                  </Link>
                </Button>
                <Button size="sm" variant="ghost">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download
                </Button>
              </>
            )}
            {session.status === 'draft' && (
              <Button asChild size="sm" variant="glow">
                <Link href={`/collections/new?resume=${session.id}`}>
                  <Edit2 className="mr-1 h-3.5 w-3.5" />
                  Continue
                </Link>
              </Button>
            )}
            {session.status === 'generating' && (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/collections/${session.id}`}>
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  View Progress
                </Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="ml-auto">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(session.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
}
