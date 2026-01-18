'use client';

import { cn } from '@/lib/utils';
import { Card } from './card';
import { Skeleton } from './spinner';

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="mt-2 h-8 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </Card>
        ))}
      </div>

      {/* Recent Collections */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-1 h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Collections list skeleton
export function CollectionsListSkeleton() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-10 max-w-sm flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <div className="p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <div className="mt-4 flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Products list skeleton
export function ProductsListSkeleton() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-10 max-w-sm flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-1 h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Image gallery skeleton
export function ImageGallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <div className="p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-1 h-3 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-5', i === 0 ? 'w-10' : i === 1 ? 'h-12 w-12 rounded' : 'flex-1')}
        />
      ))}
    </div>
  );
}

// Wizard step skeleton
export function WizardStepSkeleton() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <Skeleton className="mx-auto h-8 w-64" />
        <Skeleton className="mx-auto mt-2 h-4 w-96" />
      </div>
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <Skeleton key={j} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
