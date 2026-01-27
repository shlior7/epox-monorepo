// Copy to clipboard hook with toast feedback

import { useState } from 'react';
import { useToast } from './useToast';

interface UseCopyToClipboardReturn {
  copy: (text: string, successMessage?: string) => Promise<boolean>;
  isCopied: boolean;
}

export const useCopyToClipboard = (): UseCopyToClipboardReturn => {
  const [isCopied, setIsCopied] = useState(false);
  const { success, error } = useToast();

  const copy = async (text: string, successMessage: string = 'Copied to clipboard'): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      success(successMessage);

      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);

      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      error('Failed to copy to clipboard');
      return false;
    }
  };

  return { copy, isCopied };
};
