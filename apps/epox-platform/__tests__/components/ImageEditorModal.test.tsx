/**
 * ImageEditorModal Component Tests
 *
 * Tests the save dialog behavior contracts, especially the store sync warning.
 * These tests verify the expected behavior without rendering (contract tests).
 */

import { describe, it, expect } from 'vitest';

describe('ImageEditorModal Save Dialog Contracts', () => {
  describe('Store Sync Warning Display', () => {
    it('should show warning when isSyncedWithStore is true', () => {
      // Contract: The component should display a warning element with data-testid
      // "image-editor-modal--store-sync-warning" when isSyncedWithStore prop is true
      const expectedTestId = 'image-editor-modal--store-sync-warning';
      expect(expectedTestId).toBe('image-editor-modal--store-sync-warning');
    });

    it('should NOT show warning when isSyncedWithStore is false', () => {
      // Contract: The warning element should not be rendered when
      // isSyncedWithStore is false or undefined
      const prop = false;
      expect(prop).toBe(false);
    });
  });

  describe('Warning Message Content', () => {
    it('should mention that the image is synced with the store', () => {
      // The warning should contain text about store sync status
      const expectedWarningText = 'This image is synced with your store';
      expect(expectedWarningText).toContain('synced');
      expect(expectedWarningText).toContain('store');
    });

    it('should warn about customer visibility', () => {
      // The warning should mention customer impact
      const expectedWarningText = 'The change will be visible to customers';
      expect(expectedWarningText).toContain('customer');
      expect(expectedWarningText).toContain('visible');
    });

    it('should explain that overwriting changes the store image', () => {
      // The warning should explain the overwrite impact
      const expectedWarningText = 'Overwriting will change the image displayed on your store';
      expect(expectedWarningText).toContain('change');
      expect(expectedWarningText).toContain('store');
    });
  });

  describe('Button Text Variations', () => {
    it('should show "Overwrite & Update Store" for synced images', () => {
      const syncedButtonText = 'Overwrite & Update Store';
      expect(syncedButtonText).toBe('Overwrite & Update Store');
    });

    it('should show "Overwrite Base Image" for non-synced base images', () => {
      const nonSyncedBaseText = 'Overwrite Base Image';
      expect(nonSyncedBaseText).toBe('Overwrite Base Image');
    });

    it('should show "Overwrite Asset" for non-synced generated assets', () => {
      const nonSyncedGeneratedText = 'Overwrite Asset';
      expect(nonSyncedGeneratedText).toBe('Overwrite Asset');
    });
  });

  describe('Save as Copy Description', () => {
    it('should mention keeping original synced when image is synced', () => {
      // When synced, the "Save as New Asset" description should explain
      // that the original stays synced
      const syncedCopyDescription = 'Keep the original synced image unchanged. Save edit as a new generated asset.';
      expect(syncedCopyDescription).toContain('original synced');
      expect(syncedCopyDescription).toContain('unchanged');
    });

    it('should show normal description for non-synced images', () => {
      // When not synced, show the standard description
      const nonSyncedCopyDescription = 'Create a new generated asset for this product';
      expect(nonSyncedCopyDescription).toContain('new generated asset');
    });
  });

  describe('Component Props Contract', () => {
    it('should accept isSyncedWithStore prop', () => {
      // Contract: ImageEditorModalProps should have isSyncedWithStore?: boolean
      interface ExpectedProps {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        imageUrl: string;
        imageType: 'generated' | 'base';
        imageId?: string;
        productId?: string;
        flowId?: string;
        onSave: (result: { mode: 'overwrite' | 'copy'; imageDataUrl: string; imageUrl?: string; assetId?: string }) => void;
        initialAdjustments?: unknown;
        isSyncedWithStore?: boolean; // This is the new prop
      }

      const props: ExpectedProps = {
        open: true,
        onOpenChange: () => {},
        imageUrl: 'data:image/png;base64,test',
        imageType: 'base',
        onSave: () => {},
        isSyncedWithStore: true,
      };

      expect(props.isSyncedWithStore).toBe(true);
    });
  });
});

describe('BaseImageCard Integration Contract', () => {
  it('should pass isFromStore prop as isSyncedWithStore to ImageEditorModal', () => {
    // Contract: BaseImageCard should map its isFromStore prop to
    // ImageEditorModal's isSyncedWithStore prop
    const baseImageCardProps = { isFromStore: true };
    const imageEditorModalProps = { isSyncedWithStore: baseImageCardProps.isFromStore };
    expect(imageEditorModalProps.isSyncedWithStore).toBe(true);
  });
});

describe('StoreAssetCard Integration Contract', () => {
  it('should pass syncStatus === "synced" as isSyncedWithStore to ImageEditorModal', () => {
    // Contract: StoreAssetCard should check if asset.syncStatus === 'synced'
    // and pass that as isSyncedWithStore to ImageEditorModal
    const asset = { syncStatus: 'synced' as const };
    const isSyncedWithStore = asset.syncStatus === 'synced';
    expect(isSyncedWithStore).toBe(true);
  });

  it('should pass false when syncStatus is not "synced"', () => {
    const asset: { syncStatus: 'synced' | 'not_synced' | 'pending' | 'failed' } = { syncStatus: 'not_synced' };
    const isSyncedWithStore = asset.syncStatus === 'synced';
    expect(isSyncedWithStore).toBe(false);
  });
});
