'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface UseUnsavedChangesOptions {
  isDirty: boolean;
  onSave?: () => Promise<void>;
  message?: string;
}

export interface UseUnsavedChangesResult {
  showWarningDialog: boolean;
  pendingNavigation: string | null;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  saveAndNavigate: () => Promise<void>;
}

/**
 * Hook to handle unsaved changes warnings.
 * - Shows browser warning on page close/refresh when dirty
 * - Provides state for showing a warning dialog before navigation
 */
export function useUnsavedChanges({
  isDirty,
  onSave,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseUnsavedChangesOptions): UseUnsavedChangesResult {
  const router = useRouter();
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Browser close/refresh warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // Confirm navigation (discard changes)
  const confirmNavigation = useCallback(() => {
    const url = pendingNavigation;
    setShowWarningDialog(false);
    setPendingNavigation(null);
    if (url) {
      router.push(url);
    }
  }, [pendingNavigation, router]);

  // Cancel navigation
  const cancelNavigation = useCallback(() => {
    setShowWarningDialog(false);
    setPendingNavigation(null);
  }, []);

  // Save and then navigate
  const saveAndNavigate = useCallback(async () => {
    if (onSave) {
      await onSave();
    }
    const url = pendingNavigation;
    setShowWarningDialog(false);
    setPendingNavigation(null);
    if (url) {
      router.push(url);
    }
  }, [onSave, pendingNavigation, router]);

  return {
    showWarningDialog,
    pendingNavigation,
    confirmNavigation,
    cancelNavigation,
    saveAndNavigate,
  };
}

/**
 * Create a navigation handler that checks for unsaved changes.
 * Use this to wrap navigation calls that should be blocked when dirty.
 */
export function createNavigationGuard(
  isDirty: boolean,
  setPendingNavigation: (url: string) => void,
  setShowWarningDialog: (show: boolean) => void
) {
  return (url: string) => {
    if (isDirty) {
      setPendingNavigation(url);
      setShowWarningDialog(true);
      return false; // Navigation blocked
    }
    return true; // Navigation allowed
  };
}
