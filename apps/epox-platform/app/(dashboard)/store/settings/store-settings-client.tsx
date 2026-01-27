'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Loader2,
  Check,
  ArrowLeft,
  ExternalLink,
  Store,
  Unplug,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SyncSettings {
  autoSyncOnApproval: boolean;
  imageQuality: 'high' | 'medium' | 'compressed';
  imageFormat: 'original' | 'webp' | 'png' | 'jpeg';
}

interface StoreConnection {
  id: string;
  storeType: string;
  storeUrl: string;
  storeName?: string;
  status: string;
  createdAt: string;
}

export function StoreSettingsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SyncSettings>({
    autoSyncOnApproval: false,
    imageQuality: 'high',
    imageFormat: 'original',
  });

  // Fetch store connection status
  const {
    data: connectionData,
    isLoading: isLoadingConnection,
  } = useQuery({
    queryKey: ['store-connection-status'],
    queryFn: async () => {
      const response = await fetch('/api/store-connection/status');
      if (!response.ok) {
        throw new Error('Failed to fetch store connection status');
      }
      return response.json() as Promise<{
        connected: boolean;
        connection: StoreConnection | null;
      }>;
    },
  });

  // Fetch current settings
  const { data: currentSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const response = await fetch('/api/store-connection/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return response.json() as Promise<SyncSettings>;
    },
  });

  // Update local state when settings are fetched
  useEffect(() => {
    if (currentSettings) {
      // Load imageQuality and imageFormat from localStorage if available
      const storedQuality = localStorage.getItem('store-image-quality');
      const storedFormat = localStorage.getItem('store-image-format');

      setSettings({
        autoSyncOnApproval: currentSettings.autoSyncOnApproval,
        imageQuality: (storedQuality as SyncSettings['imageQuality']) || currentSettings.imageQuality,
        imageFormat: (storedFormat as SyncSettings['imageFormat']) || currentSettings.imageFormat,
      });
    }
  }, [currentSettings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: SyncSettings) => {
      const response = await fetch('/api/store-connection/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success('Settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Disconnect store mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/store-connection', {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect store');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-connection-status'] });
      toast.success('Store disconnected');
      router.push('/store');
    },
    onError: (error) => {
      toast.error('Failed to disconnect store', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleSave = () => {
    // Save imageQuality and imageFormat to localStorage
    localStorage.setItem('store-image-quality', settings.imageQuality);
    localStorage.setItem('store-image-format', settings.imageFormat);

    // Save autoSyncOnApproval to the database
    saveMutation.mutate(settings);
  };

  const isLoading = isLoadingConnection || isLoadingSettings;
  const connection = connectionData?.connection;

  // Format store type for display
  const formatStoreType = (type: string) => {
    const types: Record<string, string> = {
      woocommerce: 'WooCommerce',
      shopify: 'Shopify',
      bigcommerce: 'BigCommerce',
    };
    return types[type.toLowerCase()] || type;
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col" data-testid="store-settings-loading">
        <PageHeader
          title="Store Settings"
          description="Configure your store connection and sync preferences"
          testId="store-settings-header"
        />
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!connectionData?.connected || !connection) {
    return (
      <div className="flex h-full flex-col" data-testid="store-settings-no-connection">
        <PageHeader
          title="Store Settings"
          description="Configure your store connection and sync preferences"
          testId="store-settings-header"
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Store Connected</h2>
            <p className="text-muted-foreground mb-4">
              Connect your store to configure settings
            </p>
            <Button asChild>
              <Link href="/store">Go to Store</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="store-settings-page">
      <PageHeader
        title="Store Settings"
        description="Configure your store connection and sync preferences"
        testId="store-settings-header"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/store">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
        {/* Store Connection Details */}
        <Card data-testid="store-connection-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Connection
            </CardTitle>
            <CardDescription>
              Details about your connected e-commerce store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Store Type</Label>
                <p className="font-medium">{formatStoreType(connection.storeType)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div>
                  <Badge
                    variant={connection.status === 'active' ? 'default' : 'secondary'}
                    className={connection.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {connection.status === 'active' ? 'Connected' : connection.status}
                  </Badge>
                </div>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Store URL</Label>
                <a
                  href={connection.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  {connection.storeUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {connection.storeName && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Store Name</Label>
                  <p className="font-medium">{connection.storeName}</p>
                </div>
              )}
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Connected Since</Label>
                <p className="font-medium">
                  {new Date(connection.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={disconnectMutation.isPending}
                    data-testid="disconnect-store-btn"
                  >
                    <Unplug className="h-4 w-4 mr-2" />
                    Disconnect Store
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Disconnect Store?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the connection to your store. You can reconnect at any time,
                      but any pending syncs will be cancelled. Your products and assets will remain
                      in the platform.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => disconnectMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {disconnectMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card data-testid="sync-settings-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Sync Settings
            </CardTitle>
            <CardDescription>
              Configure how assets are synced to your store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto-sync on Approval */}
            <div
              className="flex items-center justify-between"
              data-testid="auto-sync-setting"
            >
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync" className="text-sm font-medium">
                  Auto-sync on Approval
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync assets to your store when they are approved
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={settings.autoSyncOnApproval}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, autoSyncOnApproval: checked }))
                }
                data-testid="auto-sync-switch"
              />
            </div>

            <Separator />

            {/* Image Quality */}
            <div className="space-y-2" data-testid="quality-setting">
              <Label htmlFor="image-quality" className="text-sm font-medium">
                Image Quality
              </Label>
              <Select
                value={settings.imageQuality}
                onValueChange={(value: 'high' | 'medium' | 'compressed') =>
                  setSettings((prev) => ({ ...prev, imageQuality: value }))
                }
              >
                <SelectTrigger id="image-quality" data-testid="quality-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Quality</SelectItem>
                  <SelectItem value="medium">Medium Quality</SelectItem>
                  <SelectItem value="compressed">Compressed</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher quality results in larger file sizes
              </p>
            </div>

            {/* Image Format */}
            <div className="space-y-2" data-testid="format-setting">
              <Label htmlFor="image-format" className="text-sm font-medium">
                Image Format
              </Label>
              <Select
                value={settings.imageFormat}
                onValueChange={(value: 'original' | 'webp' | 'png' | 'jpeg') =>
                  setSettings((prev) => ({ ...prev, imageFormat: value }))
                }
              >
                <SelectTrigger id="image-format" data-testid="format-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original Format</SelectItem>
                  <SelectItem value="webp">WebP (Recommended)</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                WebP offers the best balance of quality and file size
              </p>
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="save-settings-btn"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
