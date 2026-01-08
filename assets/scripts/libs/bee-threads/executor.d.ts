/**
 * @fileoverview Fluent API builder for bee-threads.
 *
 * ## Why This File Exists
 *
 * Provides the chainable "builder" API that makes bee-threads ergonomic.
 * Implements the immutable builder pattern - each method returns a NEW
 * executor instance, allowing safe configuration reuse.
 *
 * ## What It Does
 *
 * - Creates chainable executor instances
 * - Validates inputs before execution (fail-fast)
 * - Accumulates configuration immutably
 * - Delegates actual execution to `execution.ts`
 *
 * ## Fluent API Methods
 *
 * - `.usingParams(...args)` - set function arguments
 * - `.setContext({...})` - inject closure variables
 * - `.signal(AbortSignal)` - enable cancellation
 * - `.transfer([...])` - zero-copy ArrayBuffer transfer
 * - `.retry({ maxAttempts, baseDelay })` - enable retry with backoff
 * - `.priority('high'|'normal'|'low')` - set queue priority
 * - `.execute()` - run the task
 *
 * ## Why Immutable?
 *
 * Immutable builders allow safe reuse:
 *
 * ```js
 * const base = beeThreads.run(fn).setContext({ API_KEY });
 * await base.usingParams(1).execute(); // Safe to reuse
 * await base.usingParams(2).execute(); // Same context, different params
 * ```
 *
 * @module bee-threads/executor
 * @internal
 */
import type { Priority, ExecutionOptions, RetryOptions } from './types';
/** Internal state for an executor instance */
interface ExecutorState {
    fnString: string;
    fnHash: string;
    options: ExecutionOptions;
    args: unknown[];
}
/** The chainable executor interface */
export interface Executor<T = unknown> {
    usingParams(...params: unknown[]): Executor<T>;
    setContext(context: Record<string, unknown>): Executor<T>;
    signal(abortSignal: AbortSignal): Executor<T>;
    transfer(list: ArrayBufferLike[]): Executor<T>;
    retry(retryOptions?: RetryOptions): Executor<T>;
    priority(level: Priority): Executor<T>;
    noCoalesce(): Executor<T>;
    /** Enable automatic Uint8Array to Buffer reconstruction for worker results */
    reconstructBuffers(): Executor<T>;
    execute(): Promise<T>;
}
/**
 * Creates an immutable, chainable executor.
 */
export declare function createExecutor<T = unknown>(state: ExecutorState): Executor<T>;
/** Any callable function type */
type AnyFunction = (...args: any[]) => any;
/**
 * Creates a runner function with preset base options.
 * Type inference extracts ReturnType from the function automatically.
 */
export declare function createCurriedRunner(baseOptions?: ExecutionOptions): <T extends AnyFunction>(fn: T) => Executor<ReturnType<T>>;
export {};
//# sourceMappingURL=executor.d.ts.map