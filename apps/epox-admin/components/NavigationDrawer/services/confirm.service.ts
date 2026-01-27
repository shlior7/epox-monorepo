import { useMemo } from 'react';
import { useConfirm, type ConfirmDialog } from '@/lib/hooks/useConfirm';

export interface ConfirmService {
  confirm: (options: ConfirmDialog) => Promise<boolean>;
}

export function useConfirmService(): ConfirmService {
  const confirm = useConfirm((state) => state.confirm);

  return useMemo(
    () => ({
      confirm,
    }),
    [confirm]
  );
}
