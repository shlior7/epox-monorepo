'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SyncSettings {
  autoSyncOnApproval: boolean;
  imageQuality: 'high' | 'medium' | 'compressed';
  imageFormat: 'original' | 'webp' | 'png' | 'jpeg';
}

interface SyncSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId?: string;
}

export function SyncSettingsModal({
  open,
  onOpenChange,
  testId = 'sync-settings-modal',
}: SyncSettingsModalProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SyncSettings>({
    autoSyncOnApproval: false,
    imageQuality: 'high',
    imageFormat: 'original',
  });

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const response = await fetch('/api/store-connection/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return response.json() as Promise<SyncSettings>;
    },
    enabled: open,
  });

  // Update local state when settings are fetched
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
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
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid={`${testId}-title`}>
            <Settings className="h-5 w-5" />
            Sync Settings
          </DialogTitle>
          <DialogDescription data-testid={`${testId}-description`}>
            Configure how assets are synced to your store.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Auto-sync on Approval */}
            <div className="flex items-center justify-between" data-testid={`${testId}-auto-sync`}>
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync" className="text-sm font-medium">
                  Auto-sync on Approval
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync assets when they are approved
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={settings.autoSyncOnApproval}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, autoSyncOnApproval: checked }))
                }
                data-testid={`${testId}-auto-sync-switch`}
              />
            </div>

            {/* Image Quality */}
            <div className="space-y-2" data-testid={`${testId}-quality`}>
              <Label htmlFor="image-quality" className="text-sm font-medium">
                Image Quality
              </Label>
              <Select
                value={settings.imageQuality}
                onValueChange={(value: 'high' | 'medium' | 'compressed') =>
                  setSettings((prev) => ({ ...prev, imageQuality: value }))
                }
              >
                <SelectTrigger id="image-quality" data-testid={`${testId}-quality-trigger`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high" data-testid={`${testId}-quality-high`}>
                    High Quality
                  </SelectItem>
                  <SelectItem value="medium" data-testid={`${testId}-quality-medium`}>
                    Medium Quality
                  </SelectItem>
                  <SelectItem value="compressed" data-testid={`${testId}-quality-compressed`}>
                    Compressed
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher quality results in larger file sizes
              </p>
            </div>

            {/* Image Format */}
            <div className="space-y-2" data-testid={`${testId}-format`}>
              <Label htmlFor="image-format" className="text-sm font-medium">
                Image Format
              </Label>
              <Select
                value={settings.imageFormat}
                onValueChange={(value: 'original' | 'webp' | 'png' | 'jpeg') =>
                  setSettings((prev) => ({ ...prev, imageFormat: value }))
                }
              >
                <SelectTrigger id="image-format" data-testid={`${testId}-format-trigger`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original" data-testid={`${testId}-format-original`}>
                    Original Format
                  </SelectItem>
                  <SelectItem value="webp" data-testid={`${testId}-format-webp`}>
                    WebP (Recommended)
                  </SelectItem>
                  <SelectItem value="png" data-testid={`${testId}-format-png`}>
                    PNG
                  </SelectItem>
                  <SelectItem value="jpeg" data-testid={`${testId}-format-jpeg`}>
                    JPEG
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                WebP offers the best balance of quality and file size
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid={`${testId}-cancel-btn`}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || saveMutation.isPending}
            data-testid={`${testId}-save-btn`}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
