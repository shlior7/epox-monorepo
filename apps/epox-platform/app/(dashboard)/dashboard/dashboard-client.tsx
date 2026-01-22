'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Package,
  FolderKanban,
  ImageIcon,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Zap,
  Search,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout';
import { Skeleton } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient, type Product } from '@/lib/api-client';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'muted' | 'secondary' | 'processing' | 'success' | 'destructive';
    dot?: boolean;
  }
> = {
  draft: { label: 'Draft', variant: 'muted' },
  configured: { label: 'Ready', variant: 'secondary' },
  generating: { label: 'Generating', variant: 'processing', dot: true },
  completed: { label: 'Completed', variant: 'success' },
  error: { label: 'Error', variant: 'destructive' },
};

export function DashboardClient() {
  const router = useRouter();

  // Create Flow dialog state
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch dashboard data with useQuery - will use prefetched data if available
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.getDashboard(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const stats = dashboardData?.stats ?? null;
  const recentCollections = dashboardData?.recentCollections ?? [];

  // Fetch products when dialog opens
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', 'dialog'],
    queryFn: () => apiClient.listProducts({ limit: 50 }),
    enabled: showCreateFlow,
    staleTime: 60 * 1000,
  });

  const products = productsData?.products ?? [];

  // Create studio session mutation
  const createSessionMutation = useMutation({
    mutationFn: (product: Product) =>
      apiClient.createGenerationFlow({
        productId: product.id,
        productName: product.name,
        mode: 'generate',
      }),
    onSuccess: (session, product) => {
      router.push(`/studio/${session.id}?productId=${product.id}`);
    },
    onError: (err) => {
      toast.error('Failed to create session');
      console.error('Failed to create flow:', err);
    },
  });

  const handleCreateFlow = () => {
    if (!selectedProduct) return;
    createSessionMutation.mutate(selectedProduct);
  };

  const creatingSession = createSessionMutation.isPending;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const creditsUsed = stats ? Math.max(0, 1000 - stats.creditsRemaining) : 0;
  const creditsTotal = 1000;
  const creditsPercent = (creditsUsed / creditsTotal) * 100;
  const creditsResetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Welcome back! Here's what's happening with your visualizations."
        />
        <div className="max-w-7xl space-y-8 p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" description="Welcome back!" />
        <div className="p-8 text-center">
          <p className="text-destructive">
            {error instanceof Error ? error.message : 'Failed to load dashboard'}
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening with your visualizations."
        actions={
          <Button variant="glow" onClick={() => setShowCreateFlow(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Create Flow
          </Button>
        }
      />

      <div className="max-w-7xl space-y-8 p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Products"
            value={stats?.totalProducts ?? 0}
            icon={Package}
            trend={`${stats?.totalProducts ?? 0} in catalog`}
          />
          <StatCard
            title="Collections"
            value={stats?.totalCollections ?? 0}
            icon={FolderKanban}
            trend={`${recentCollections.filter((c) => c.status === 'generating').length} active`}
            accent="cyan"
          />
          <StatCard
            title="Generated"
            value={stats?.totalGenerated ?? 0}
            icon={ImageIcon}
            trend="Total images"
            accent="emerald"
          />

          {/* Credits Card */}
          <Card variant="gradient" className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Credits</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight">
                  {(stats?.creditsRemaining ?? 0).toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground">
                  /{creditsTotal.toLocaleString()}
                </span>
              </div>
              <Progress value={100 - creditsPercent} className="mt-4 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                Resets {formatRelativeTime(creditsResetAt)}
              </p>
            </CardContent>
            <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
          </Card>
        </div>

        {/* Recent Collections */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Collections</h2>
              <p className="text-sm text-muted-foreground">Your latest generation projects</p>
            </div>
            <Link href="/collections">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentCollections.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-medium">No collections yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first collection to start generating images
              </p>
              <Link href="/collections/new">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Collection
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentCollections.map((collection, index) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className={cn('block animate-fade-in opacity-0', `stagger-${index + 1}`)}
                >
                  <Card variant="interactive" className="group p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={cn(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                            'bg-gradient-to-br from-primary/20 to-accent/10',
                            'border border-primary/20',
                            'group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/10',
                            'transition-all duration-300'
                          )}
                        >
                          <FolderKanban className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-medium transition-colors group-hover:text-primary">
                            {collection.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {collection.productCount} products •{' '}
                            {collection.generatedCount > 0
                              ? `${collection.generatedCount} generated`
                              : 'Not started'}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <Badge
                          variant={statusConfig[collection.status]?.variant ?? 'muted'}
                          dot={statusConfig[collection.status]?.dot}
                        >
                          {statusConfig[collection.status]?.label ?? collection.status}
                        </Badge>
                        <span className="flex min-w-[100px] items-center justify-end gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeTime(new Date(collection.updatedAt))}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="mb-5 text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <QuickActionCard
              title="Create Flow"
              description="Generate images for a single product"
              icon={Sparkles}
              onClick={() => setShowCreateFlow(true)}
              primary
            />
            <QuickActionCard
              title="Create Collection"
              description="Generate images for multiple products at once"
              icon={FolderKanban}
              href="/collections/new"
            />
            <QuickActionCard
              title="Add Products"
              description="Import from your store or upload manually"
              icon={Plus}
              href="/products"
            />
          </div>
        </section>
      </div>

      {/* Create Flow Dialog */}
      <Dialog open={showCreateFlow} onOpenChange={setShowCreateFlow}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Flow
            </DialogTitle>
            <DialogDescription>
              Select a product to generate stunning lifestyle images
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {products.length === 0 ? 'No products in your catalog' : 'No matching products'}
                </p>
                {products.length === 0 && (
                  <Link href="/products">
                    <Button variant="outline" className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Products
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  const imageUrl =
                    product.images?.[0]?.previewUrl ||
                    product.images?.[0]?.baseUrl ||
                    product.imageUrl;

                  return (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(isSelected ? null : product)}
                      className={cn(
                        'group relative flex flex-col overflow-hidden rounded-lg border p-3 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary'
                          : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                      )}
                    >
                      <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-secondary">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 120px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                              <Check className="h-5 w-5 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{product.sku}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setShowCreateFlow(false)}>
              Cancel
            </Button>
            <Button
              variant="glow"
              disabled={!selectedProduct || creatingSession}
              onClick={handleCreateFlow}
            >
              {creatingSession ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Creating
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent = 'primary',
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend: string;
  trendUp?: boolean;
  accent?: 'primary' | 'cyan' | 'emerald' | 'amber';
}) {
  const accentColors = {
    primary: 'from-primary/20 to-primary/5 text-primary border-primary/20',
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-500 border-cyan-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-500 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-500 border-amber-500/20',
  };

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              'bg-gradient-to-br',
              accentColors[accent]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</span>
        </div>
        <p className={cn('mt-1 text-xs', trendUp ? 'text-emerald-500' : 'text-muted-foreground')}>
          {trendUp && <TrendingUp className="mr-1 inline h-3 w-3" />}
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  primary,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  const content = (
    <Card variant={primary ? 'accent' : 'interactive'} className={cn('h-full p-6', 'group')}>
      <div
        className={cn(
          'mb-4 flex h-11 w-11 items-center justify-center rounded-xl',
          'transition-all duration-300',
          primary
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/30'
            : 'bg-secondary text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-1 font-semibold transition-colors group-hover:text-primary">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return <Link href={href ?? '#'}>{content}</Link>;
}
