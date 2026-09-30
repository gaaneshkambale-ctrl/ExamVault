import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnswerSyncQueue,
  isRetryableSaveError,
  pendingAnswersStorageKey,
  type PendingAnswer,
  type SyncStatus,
} from './answerSyncQueue';

const answer = (questionId: string, selectedOptionId: string | null = 'o1'): PendingAnswer => ({
  questionId,
  selectedOptionId,
  isMarkedForReview: false,
  textAnswer: null,
  selectedOptionIds: null,
});

const networkError = () => Object.assign(new Error('Network Error'), { response: undefined });
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('isRetryableSaveError', () => {
  it('retries network failures, 5xx, 408 and 429 but not other 4xx', () => {
    expect(isRetryableSaveError(networkError())).toBe(true);
    expect(isRetryableSaveError(httpError(503))).toBe(true);
    expect(isRetryableSaveError(httpError(408))).toBe(true);
    expect(isRetryableSaveError(httpError(429))).toBe(true);
    expect(isRetryableSaveError(httpError(400))).toBe(false);
    expect(isRetryableSaveError(httpError(403))).toBe(false);
    expect(isRetryableSaveError(httpError(409))).toBe(false);
  });
});

describe('AnswerSyncQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = (save: (a: PendingAnswer) => Promise<unknown>, storage = memoryStorage()) => {
    const statuses: SyncStatus[] = [];
    const queue = new AnswerSyncQueue({
      attemptId: 'att1',
      save,
      storage,
      onChange: (s) => statuses.push(s),
      describeError: (e) => (e as Error).message,
      retryDelaysMs: [1000, 2000],
    });
    return { queue, statuses, storage };
  };

  it('saves an answer and clears it from storage', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { queue, storage } = make(save);
    queue.enqueue(answer('q1'));
    expect(await queue.flush()).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.pendingCount).toBe(0);
    expect(storage.data.has(pendingAnswersStorageKey('att1'))).toBe(false);
  });

  it('keeps an answer while offline, persists it, and retries with backoff until it lands', async () => {
    const save = vi.fn().mockRejectedValueOnce(networkError()).mockRejectedValueOnce(networkError()).mockResolvedValue({});
    const { queue, storage } = make(save);
    queue.enqueue(answer('q1'));
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.pendingCount).toBe(1);
    expect(storage.data.get(pendingAnswersStorageKey('att1'))).toContain('q1');

    await vi.advanceTimersByTimeAsync(1000); // first retry fails again
    expect(save).toHaveBeenCalledTimes(2);
    expect(queue.pendingCount).toBe(1);

    await vi.advanceTimersByTimeAsync(2000); // second retry succeeds
    expect(save).toHaveBeenCalledTimes(3);
    expect(queue.pendingCount).toBe(0);
  });

  it('flush() returns false without waiting when still offline', async () => {
    const { queue } = make(vi.fn().mockRejectedValue(networkError()));
    queue.enqueue(answer('q1'));
    expect(await queue.flush()).toBe(false);
    expect(queue.pendingCount).toBe(1);
  });

  it('retryNow() (browser back online) retries immediately', async () => {
    const save = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValue({});
    const { queue } = make(save);
    queue.enqueue(answer('q1'));
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.pendingCount).toBe(1);
    queue.retryNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.pendingCount).toBe(0);
  });

  it('latest answer per question wins, and a change made mid-save is not lost', async () => {
    const sent: PendingAnswer[] = [];
    let release: () => void = () => {};
    const save = vi.fn((a: PendingAnswer) => {
      sent.push(a);
      return sent.length === 1 ? new Promise<void>((r) => (release = r)) : Promise.resolve();
    });
    const { queue } = make(save);
    queue.enqueue(answer('q1', 'A'));
    await vi.advanceTimersByTimeAsync(0);
    queue.enqueue(answer('q1', 'B')); // changed while the first save is in flight
    release();
    await queue.flush();
    expect(sent.map((a) => a.selectedOptionId)).toEqual(['A', 'B']);
    expect(queue.pendingCount).toBe(0);
  });

  it('drops a permanently rejected answer, reports it, and continues with the rest', async () => {
    const save = vi.fn((a: PendingAnswer) => (a.questionId === 'q1' ? Promise.reject(httpError(400)) : Promise.resolve({})));
    const { queue, statuses } = make(save);
    queue.enqueue(answer('q1'));
    queue.enqueue(answer('q2'));
    expect(await queue.flush()).toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.some((s) => s.error === 'HTTP 400')).toBe(true);
    expect(statuses.at(-1)?.error).toBeNull(); // cleared by q2's success
  });

  it('restores answers left in storage by an earlier page load and syncs them', async () => {
    const storage = memoryStorage();
    storage.setItem(pendingAnswersStorageKey('att1'), JSON.stringify([answer('q9', 'Z')]));
    const save = vi.fn().mockResolvedValue({});
    const { queue } = make(save, storage);
    expect(queue.getPending().map((a) => a.questionId)).toEqual(['q9']);
    expect(await queue.flush()).toBe(true);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'q9', selectedOptionId: 'Z' }));
  });

  it('ignores corrupt stored data', () => {
    const storage = memoryStorage();
    storage.setItem(pendingAnswersStorageKey('att1'), '{not json');
    const { queue } = make(vi.fn(), storage);
    expect(queue.pendingCount).toBe(0);
  });
});
