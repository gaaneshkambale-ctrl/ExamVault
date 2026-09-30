// Offline-safe answer saving for the exam-taking screen.
//
// Every answer change is queued here (latest value per question wins, since
// saves are upserts), mirrored to localStorage so a reload/crash while offline
// doesn't lose it, and flushed one at a time with exponential-backoff retry.
// A save the server rejects for good (4xx: time's up, locked question, ...)
// is dropped and reported instead of being retried forever.

export interface PendingAnswer {
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  textAnswer: string | null;
  selectedOptionIds: string[] | null;
}

export interface SyncStatus {
  pending: number;
  syncing: boolean;
  lastSavedAt: Date | null;
  // Set when the server permanently rejected a save; cleared by the next success.
  error: string | null;
}

interface QueueOptions {
  attemptId: string;
  save: (answer: PendingAnswer) => Promise<unknown>;
  onChange: (status: SyncStatus) => void;
  describeError?: (error: unknown) => string;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  retryDelaysMs?: number[];
}

interface Entry {
  answer: PendingAnswer;
  version: number;
}

const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];

export const pendingAnswersStorageKey = (attemptId: string) => `examvault.pendingAnswers.${attemptId}`;

// A failure worth retrying: no response at all (offline / network), a server
// error, or a "slow down" style status. Anything else is a definite "no".
export function isRetryableSaveError(error: unknown): boolean {
  const response = (error as { response?: { status?: number } } | null)?.response;
  if (!response) {
    return true;
  }
  const status = response.status ?? 0;
  return status >= 500 || status === 408 || status === 429;
}

function defaultStorage(): QueueOptions['storage'] {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class AnswerSyncQueue {
  private readonly entries = new Map<string, Entry>();
  private readonly storage: QueueOptions['storage'];
  private readonly retryDelays: number[];
  private version = 0;
  private running: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private lastSavedAt: Date | null = null;
  private error: string | null = null;
  private disposed = false;

  private readonly options: QueueOptions;

  constructor(options: QueueOptions) {
    this.options = options;
    this.storage = options.storage === undefined ? defaultStorage() : options.storage;
    this.retryDelays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    for (const answer of this.readStored()) {
      this.entries.set(answer.questionId, { answer, version: ++this.version });
    }
  }

  // Answers left over from an earlier page load (e.g. the student was offline
  // when the tab closed) - the caller applies these over the server's copy.
  getPending(): PendingAnswer[] {
    return [...this.entries.values()].map((e) => e.answer);
  }

  get pendingCount(): number {
    return this.entries.size;
  }

  enqueue(answer: PendingAnswer): void {
    this.entries.set(answer.questionId, { answer, version: ++this.version });
    this.persist();
    this.emit();
    this.kick();
  }

  // Resolves true once nothing is left to sync. Does not wait out a backoff:
  // if the network is still down it returns false straight away.
  async flush(): Promise<boolean> {
    this.cancelRetryTimer();
    await this.kick();
    return this.entries.size === 0;
  }

  // Called when the browser reports it's back online.
  retryNow(): void {
    this.cancelRetryTimer();
    void this.kick();
  }

  dispose(): void {
    this.disposed = true;
    this.cancelRetryTimer();
  }

  private kick(): Promise<void> {
    if (this.running) {
      return this.running;
    }
    if (this.entries.size === 0 || this.disposed) {
      return Promise.resolve();
    }
    this.cancelRetryTimer();
    this.running = this.drain().finally(() => {
      this.running = null;
      this.emit();
    });
    this.emit();
    return this.running;
  }

  private async drain(): Promise<void> {
    while (this.entries.size > 0 && !this.disposed) {
      const [questionId, entry] = this.entries.entries().next().value as [string, Entry];
      try {
        await this.options.save(entry.answer);
      } catch (error) {
        if (isRetryableSaveError(error)) {
          this.scheduleRetry();
          this.emit();
          return;
        }
        // Permanent rejection: keep going with the rest rather than blocking.
        this.error = this.options.describeError?.(error) ?? 'An answer could not be saved.';
        if (this.entries.get(questionId)?.version === entry.version) {
          this.entries.delete(questionId);
        }
        this.persist();
        this.emit();
        continue;
      }
      this.failures = 0;
      this.error = null;
      this.lastSavedAt = new Date();
      // Only forget it if the student didn't change it while the save was in flight.
      if (this.entries.get(questionId)?.version === entry.version) {
        this.entries.delete(questionId);
      }
      this.persist();
      this.emit();
    }
  }

  private scheduleRetry(): void {
    const delay = this.retryDelays[Math.min(this.failures, this.retryDelays.length - 1)];
    this.failures += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.kick();
    }, delay);
  }

  private cancelRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private emit(): void {
    if (this.disposed) {
      return;
    }
    this.options.onChange({
      pending: this.entries.size,
      syncing: this.running !== null,
      lastSavedAt: this.lastSavedAt,
      error: this.error,
    });
  }

  private readStored(): PendingAnswer[] {
    try {
      const raw = this.storage?.getItem(pendingAnswersStorageKey(this.options.attemptId));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as PendingAnswer[]).filter((a) => a && typeof a.questionId === 'string') : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      const key = pendingAnswersStorageKey(this.options.attemptId);
      if (this.entries.size === 0) {
        this.storage?.removeItem(key);
      } else {
        this.storage?.setItem(key, JSON.stringify(this.getPending()));
      }
    } catch {
      // Storage full/blocked: the in-memory queue still works for this page load.
    }
  }
}
