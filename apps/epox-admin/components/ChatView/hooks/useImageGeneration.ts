import { useRef, useState } from 'react';
import type { Message, ImageMessagePart, MessagePart } from '@/lib/types/app-types';
import {
  createJobPollingController,
  JobPollingController,
  JobStatusPayload,
  FetchResult,
} from '@/lib/services/image-generation/job-polling-controller';

const MAX_RETRIES = 60;
const POLLING_INTERVAL = 5000; // Poll every 5 seconds

interface PollingContext {
  messageId: string;
  promptText: string;
}

export function useImageGeneration(updateMessage: (messageId: string, updates: Partial<Message>) => Promise<void>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const sessionRef = useRef<any>(null);
  const isPageVisibleRef = useRef(true);
  const updateMessageRef = useRef(updateMessage);
  updateMessageRef.current = updateMessage;

  // Track last known status for each job to avoid redundant updates
  const lastStatusRef = useRef<Map<string, string>>(new Map());

  const pollingControllerRef = useRef<JobPollingController<PollingContext> | null>(null);

  if (!pollingControllerRef.current) {
    pollingControllerRef.current = createJobPollingController<PollingContext>({
      fetchStatus: async (jobId) => {
        const response = await fetch(`/api/generate-images/${jobId}`);
        if (response.status === 404) {
          return { kind: 'not_found' } as FetchResult<PollingContext>;
        }
        if (!response.ok) {
          throw new Error(`Failed to check job status: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json()) as JobStatusPayload;
        return { kind: 'status', payload: data };
      },
      onStatus: async (jobId, payload, context) => {
        console.log(`🔄 Polling received status for job ${jobId}:`, {
          status: payload.status,
          progress: payload.progress,
          imageIdsCount: payload.imageIds?.length || 0,
        });

        const currentSession = sessionRef.current;
        if (!currentSession) return true;

        const message = currentSession.messages.find((m: Message) => m.id === context.messageId);
        if (!message) return true;

        // Check if status actually changed
        const lastStatus = lastStatusRef.current.get(jobId);
        const statusChanged = lastStatus !== payload.status;

        // Only update client JSON if status changed (not just progress updates)
        if (statusChanged) {
          console.log(`📝 Status changed for job ${jobId}: ${lastStatus} → ${payload.status}`);
          lastStatusRef.current.set(jobId, payload.status);

          const updatedParts = message.parts.map((part: MessagePart) => {
            if (part.type === 'image' && part.jobId === jobId) {
              return {
                ...part,
                status: payload.status,
                progress: payload.progress,
                error: payload.error,
                imageIds: payload.status === 'completed' ? payload.imageIds : part.imageIds,
              };
            }
            return part;
          });

          console.log(`💾 Updating message ${context.messageId} with status: ${payload.status}`);
          await updateMessageRef.current(context.messageId, { parts: updatedParts });
          console.log(`✅ Message updated successfully`);
        } else {
          console.log(`⏭️  Status unchanged (${payload.status}), skipping client JSON update`);
        }

        if (payload.status === 'completed' || payload.status === 'error') {
          console.log(`🏁 Job ${jobId} finished with status: ${payload.status}, stopping polling`);
          lastStatusRef.current.delete(jobId); // Clean up tracking
          setIsGenerating(false);
          return false;
        }
        return true;
      },
      onNotFound: async (jobId, context) => {
        const currentSession = sessionRef.current;
        if (!currentSession) return true;
        const message = currentSession.messages.find((m: Message) => m.id === context.messageId);
        if (!message) return true;

        const imagePart = message.parts.find(
          (part: MessagePart): part is ImageMessagePart => part.type === 'image' && (part as ImageMessagePart).jobId === jobId
        );
        if (imagePart && imagePart.imageIds && imagePart.imageIds.length > 0) {
          setIsGenerating(false);
          return false;
        }
        return true;
      },
      onTimeout: async (jobId, context) => {
        const currentSession = sessionRef.current;
        if (!currentSession) return;
        const message = currentSession.messages.find((m: Message) => m.id === context.messageId);
        if (!message) return;

        const updatedParts = message.parts.map((part: MessagePart) => {
          if (part.type === 'image' && part.jobId === jobId) {
            return {
              ...part,
              status: 'error' as const,
              error: 'Job timed out after maximum retries',
            };
          }
          return part;
        });

        await updateMessageRef.current(context.messageId, { parts: updatedParts });
        setIsGenerating(false);
      },
      onError: async () => {
        // Errors are logged by callers; keep polling unless max retries reached
      },
      computeInterval: () => POLLING_INTERVAL,
      isVisible: () => isPageVisibleRef.current,
      maxRetries: MAX_RETRIES,
    });
  }

  const startPolling = (jobId: string, messageId: string, promptText: string, initialStatus?: string) => {
    // Initialize status tracking for this job with known status (if resuming) or 'pending'
    lastStatusRef.current.set(jobId, initialStatus || 'pending');
    pollingControllerRef.current?.start(jobId, { messageId, promptText });
  };

  const stopPolling = (jobId: string) => {
    // Clean up status tracking when stopping
    lastStatusRef.current.delete(jobId);
    pollingControllerRef.current?.stop(jobId);
  };

  const cleanup = () => {
    // Clean up all status tracking
    lastStatusRef.current.clear();
    pollingControllerRef.current?.stopAll();
  };

  const setPageVisible = (visible: boolean) => {
    isPageVisibleRef.current = visible;
    pollingControllerRef.current?.setVisibility(visible);
  };

  return {
    isGenerating,
    setIsGenerating,
    startPolling,
    stopPolling,
    cleanup,
    sessionRef,
    setPageVisible,
  };
}
