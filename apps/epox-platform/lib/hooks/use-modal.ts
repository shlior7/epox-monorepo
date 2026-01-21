/**
 * URL-based modal management hook
 * Uses search params to enable browser back button support
 */

'use client';

import { useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export type ModalType = 'add-product' | 'connect-store' | 'import-products';

export function useModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentModal = searchParams.get('modal') as ModalType | null;

  const openModal = useCallback(
    (modal: ModalType) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('modal', modal);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const closeModal = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('modal');
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  const isOpen = useCallback((modal: ModalType) => currentModal === modal, [currentModal]);

  return {
    currentModal,
    openModal,
    closeModal,
    isOpen,
  };
}
