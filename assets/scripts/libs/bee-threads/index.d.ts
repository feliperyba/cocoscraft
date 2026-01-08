/**
 * @fileoverview bee-threads - Web Worker threads with zero boilerplate (Browser).
 *
 * ## Why This File Exists
 *
 * This is the main entry point for the bee-threads library. It acts as a
 * facade that hides internal complexity from users. Users only need to
 * `require('bee-threads')` - no deep imports required.
 *
 * ## What It Does
 *
 * - Exports `bee()` - the simple curried API for quick tasks
 * - Exports `beeThreads` - the full fluent API with all features
 * - Re-exports error classes for programmatic error handling
 * - Implements thenable support so `await bee(fn)(args)` works
 *
 * ## Usage Examples
 *
 * ```js
 * // Simple API
 * const result = await bee((x) => x * 2)(21); // 42
 *
 * // Full API
 * const result = await beeThreads
 *   .run((x) => x * 2)
 *   .usingParams(21)
 *   .execute();
 * ```
 *
 * @module bee-threads
 * @license MIT
 */
import type { CoalescingStats } from "./coalescing";
import { AbortError, AsyncThreadError, QueueFullError, TimeoutError, WorkerError } from "./errors";
import { Executor } from "./executor";
import type { MaxOptions, TurboExecutor, TurboOptions } from "./turbo";
import type { ConfigureOptions, FullPoolStats } from "./types";
import { noopLogger } from "./types";
/**
 * Curried function type with thenable support.
 * Always returns CurriedFunction<T> for chaining, but is also PromiseLike<T> for await.
 * This enables: bee(fn)(a)(b)({ beeClosures }) - infinite currying with closures.
 */
interface CurriedFunction<T> extends PromiseLike<T> {
    /** Call with more arguments - always returns a new CurriedFunction for chaining */
    (...args: unknown[]): CurriedFunction<T>;
    /** PromiseLike - enables await */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2>;
    /** Catch errors */
    catch<TResult = never>(onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null): Promise<T | TResult>;
    /** Finally handler */
    finally(onfinally?: (() => void) | null): Promise<T>;
    /** Symbol.toStringTag for full Promise compatibility (enables Promise.all, Promise.race, etc.) */
    readonly [Symbol.toStringTag]: string;
}
/**
 * Simple curried API for bee-threads.
 *
 * Minimal syntax for running functions in Web Worker threads.
 * For advanced features (timeout, retry, priority, signal), use `beeThreads`.
 *
 * @example
 * // Simple - double a number
 * const result = await bee(x => x * 2)(21)
 * // → 42
 *
 * @example
 * // With closures
 * const TAX = 0.2
 * const price = await bee(p => p * (1 + TAX))(100)({ beeClosures: { TAX } })
 * // → 120
 */
export declare function bee<T extends (...args: any[]) => any>(fn: T): CurriedFunction<ReturnType<T>>;
/**
 * The main bee-threads API object.
 */
export declare const beeThreads: {
    /**
     * Creates an executor for running a function in a Web Worker thread.
     */
    run: <T extends (...args: any[]) => any>(fn: T) => Executor<ReturnType<T>>;
    /**
     * Creates an executor with a timeout limit.
     */
    withTimeout(ms: number): <T extends (...args: any[]) => any>(fn: T) => Executor<ReturnType<T>>;
    /**
     * Configures the worker pool settings.
     */
    configure(options?: ConfigureOptions): void;
    /**
     * Pre-creates workers to eliminate cold-start latency.
     */
    warmup(count?: number): Promise<void>;
    /**
     * Creates a TurboExecutor for parallel array processing across ALL workers.
     *
     * Turbo mode divides work across all available CPU cores using SharedArrayBuffer
     * for zero-copy data transfer with TypedArrays. Ideal for processing large arrays
     * (10K+ items) with CPU-intensive per-item operations.
     *
     * @param data - Array or TypedArray to process in parallel
     * @param options - Optional turbo configuration
     * @returns TurboExecutor with map, mapWithStats, filter, reduce methods
     *
     * @example
     * ```typescript
     * // Map - transform each item in parallel
     * const squares = await beeThreads.turbo(numbers).map(x => x * x)
     *
     * // TypedArray - uses SharedArrayBuffer (zero-copy)
     * const data = new Float64Array(1_000_000)
     * const processed = await beeThreads.turbo(data).map(x => Math.sqrt(x))
     *
     * // Filter - keep items matching predicate
     * const evens = await beeThreads.turbo(numbers).filter(x => x % 2 === 0)
     *
     * // Reduce - parallel tree reduction
     * const sum = await beeThreads.turbo(numbers).reduce((a, b) => a + b, 0)
     * ```
     */
    turbo<TItem>(data: TItem[], options?: TurboOptions): TurboExecutor<TItem>;
    /**
     * Returns the minimum array size for turbo mode to be beneficial.
     * Arrays smaller than this threshold will automatically use single-worker mode.
     */
    readonly turboThreshold: number;
    /**
     * @experimental
     * Creates a MaxExecutor for maximum throughput parallel processing.
     *
     * MAX MODE uses ALL CPU cores including the main thread for processing.
     * This provides the absolute maximum throughput at the cost of blocking
     * the main thread during execution.
     *
     * ⚠️ WARNING: Blocks the main thread during processing!
     */
    max<TItem>(data: TItem[], options?: MaxOptions): TurboExecutor<TItem>;
    /**
     * Gracefully shuts down all worker pools.
     */
    shutdown(): Promise<void>;
    /**
     * Symbol.dispose for automatic cleanup with `using` keyword (ES2024).
     */
    [Symbol.dispose](): void;
    /**
     * Symbol.asyncDispose for async cleanup with `await using` keyword.
     */
    [Symbol.asyncDispose](): Promise<void>;
    /**
     * Returns current pool statistics and metrics.
     */
    getPoolStats(): Readonly<FullPoolStats>;
    /**
     * Enables or disables request coalescing (promise deduplication).
     */
    setCoalescing(enabled: boolean): void;
    /**
     * Returns whether request coalescing is currently enabled.
     */
    isCoalescingEnabled(): boolean;
    /**
     * Returns request coalescing statistics.
     */
    getCoalescingStats(): CoalescingStats;
    /**
     * Resets coalescing statistics counters.
     */
    resetCoalescingStats(): void;
};
export { AbortError, AsyncThreadError, noopLogger, QueueFullError, TimeoutError, WorkerError, };
export type { ConfigureOptions, FullPoolStats, Logger, PoolType, Priority, SafeFulfilled, SafeRejected, SafeResult, } from "./types";
export type { CoalescingStats } from "./coalescing";
export type { MaxOptions, TurboExecutor, TurboOptions, TurboResult, TurboStats, } from "./turbo";
export type { Executor } from "./executor";
export default beeThreads;
//# sourceMappingURL=index.d.ts.map