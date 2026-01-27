export type PollingStatus = 'pending' | 'generating' | 'completed' | 'error';

export interface JobStatusPayload {
  status: PollingStatus;
  progress: number;
  imageIds: string[];
  error?: string | null;
}

export type FetchResult<TContext> = { kind: 'status'; payload: JobStatusPayload } | { kind: 'not_found' };

export interface JobPollingHandlers<TContext> {
  fetchStatus: (jobId: string, context: TContext) => Promise<FetchResult<TContext>>;
  onStatus: (jobId: string, payload: JobStatusPayload, context: TContext) => Promise<boolean | void> | boolean | void;
  onNotFound?: (jobId: string, context: TContext, retryCount: number) => Promise<boolean> | boolean;
  onTimeout?: (jobId: string, context: TContext) => Promise<void> | void;
  onError?: (jobId: string, error: unknown, context: TContext, retryCount: number) => Promise<void> | void;
  computeInterval?: (retryCount: number) => number;
  isVisible?: () => boolean;
  maxRetries?: number;
}

interface JobState<TContext> {
  context: TContext;
  retryCount: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  active: boolean;
}

export class JobPollingController<TContext> {
  private readonly jobs = new Map<string, JobState<TContext>>();
  private readonly fetchStatus;
  private readonly onStatus;
  private readonly onNotFound;
  private readonly onTimeout;
  private readonly onError;
  private readonly computeInterval;
  private readonly isVisible;
  private readonly maxRetries;

  constructor(handlers: JobPollingHandlers<TContext>) {
    this.fetchStatus = handlers.fetchStatus;
    this.onStatus = handlers.onStatus;
    this.onNotFound = handlers.onNotFound ?? (() => true);
    this.onTimeout = handlers.onTimeout ?? (() => {});
    this.onError = handlers.onError ?? (() => {});
    this.computeInterval = handlers.computeInterval ?? (() => 5000);
    this.isVisible = handlers.isVisible ?? (() => true);
    this.maxRetries = handlers.maxRetries ?? 40;
  }

  start(jobId: string, context: TContext) {
    if (this.jobs.has(jobId)) return;
    const state: JobState<TContext> = {
      context,
      retryCount: 0,
      timeoutId: null,
      active: false,
    };
    this.jobs.set(jobId, state);

    if (this.isVisible()) {
      this.poll(jobId).catch((error) => {
        this.onError(jobId, error, context, state.retryCount);
      });
    }
  }

  stop(jobId: string) {
    const state = this.jobs.get(jobId);
    if (!state) return;
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    this.jobs.delete(jobId);
  }

  stopAll() {
    Array.from(this.jobs.keys()).forEach((jobId) => this.stop(jobId));
  }

  setVisibility(visible: boolean) {
    if (!visible) {
      this.jobs.forEach((state) => {
        if (state.timeoutId) {
          clearTimeout(state.timeoutId);
          state.timeoutId = null;
        }
      });
      return;
    }

    this.jobs.forEach((_, jobId) => {
      const state = this.jobs.get(jobId);
      if (state && !state.active) {
        this.schedule(jobId);
      }
    });
  }

  private schedule(jobId: string) {
    const state = this.jobs.get(jobId);
    if (!state) {
      console.log(`⚠️  Cannot schedule ${jobId}: state not found`);
      return;
    }
    if (!this.isVisible()) {
      console.log(`⚠️  Cannot schedule ${jobId}: page not visible`);
      return;
    }

    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }

    const delay = this.computeInterval(state.retryCount);
    console.log(`⏰ Scheduling poll for ${jobId} in ${delay}ms (retry #${state.retryCount})`);
    state.timeoutId = setTimeout(() => {
      console.log(`🔔 Timeout fired for ${jobId}, starting poll...`);
      this.poll(jobId).catch((error) => {
        this.onError(jobId, error, state.context, state.retryCount);
      });
    }, delay);
  }

  private async poll(jobId: string) {
    const state = this.jobs.get(jobId);
    if (!state || !this.isVisible()) {
      return;
    }

    state.active = true;

    try {
      if (state.retryCount >= this.maxRetries) {
        await this.onTimeout(jobId, state.context);
        this.stop(jobId);
        return;
      }

      const result = await this.fetchStatus(jobId, state.context);

      if (result.kind === 'not_found') {
        state.retryCount += 1;
        const shouldContinue = await this.onNotFound(jobId, state.context, state.retryCount);
        if (shouldContinue === false) {
          this.stop(jobId);
          return;
        }
        this.schedule(jobId);
        return;
      }

      state.retryCount += 1;
      const continuePolling = await this.onStatus(jobId, result.payload, state.context);
      console.log(`📊 Job ${jobId} status check:`, {
        status: result.payload.status,
        continuePolling,
        willStop: continuePolling === false || result.payload.status === 'completed' || result.payload.status === 'error',
      });

      if (continuePolling === false || result.payload.status === 'completed' || result.payload.status === 'error') {
        console.log(`🛑 Stopping polling for job ${jobId} with status: ${result.payload.status}`);
        this.stop(jobId);
        return;
      }
      console.log(`⏭️  Scheduling next poll for job ${jobId}`);
      this.schedule(jobId);
    } catch (error) {
      state.retryCount += 1;
      await this.onError(jobId, error, state.context, state.retryCount);
      this.schedule(jobId);
    } finally {
      const current = this.jobs.get(jobId);
      if (current) {
        current.active = false;
      }
    }
  }
}

export function createJobPollingController<TContext>(handlers: JobPollingHandlers<TContext>) {
  return new JobPollingController<TContext>(handlers);
}
