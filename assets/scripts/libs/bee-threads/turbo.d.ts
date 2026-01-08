/**
 * @fileoverview beeThreads.turbo - Parallel Array Processing (Browser)
 *
 * V8-OPTIMIZED: Raw for loops, monomorphic shapes, zero hidden class transitions
 * Uses structuredClone for data transfer (V8 native, efficient for all data types)
 *
 * @example
 * ```typescript
 * // New syntax - array first, function in method
 * const squares = await beeThreads.turbo(numbers).map(x => x * x)
 * const evens = await beeThreads.turbo(numbers).filter(x => x % 2 === 0)
 * const sum = await beeThreads.turbo(numbers).reduce((a, b) => a + b, 0)
 * ```
 *
 * @module bee-threads/turbo
 */
declare const TURBO_THRESHOLD = 10000;
declare const MIN_ITEMS_PER_WORKER = 1000;
export interface TurboOptions {
    /** Number of workers to use. Default: `navigator.hardwareConcurrency - 1` */
    workers?: number;
    /** Custom chunk size per worker. Default: auto-calculated */
    chunkSize?: number;
    /** Force parallel execution even for small arrays. Default: false */
    force?: boolean;
    /** Context variables to inject into worker function */
    context?: Record<string, unknown>;
}
export interface TurboStats {
    /** Total number of items processed */
    totalItems: number;
    /** Number of workers used */
    workersUsed: number;
    /** Average items per worker */
    itemsPerWorker: number;
    /** True if SharedArrayBuffer was used (TypedArrays) */
    usedSharedMemory: boolean;
    /** Total execution time in milliseconds */
    executionTime: number;
    /** Estimated speedup ratio vs single-threaded */
    speedupRatio: string;
}
export interface TurboResult<T> {
    data: T[];
    stats: TurboStats;
}
type NumericTypedArray = Float64Array | Float32Array | Int32Array | Int16Array | Int8Array | Uint32Array | Uint16Array | Uint8Array | Uint8ClampedArray;
export interface TurboExecutor<TItem> {
    /** Set the number of workers to use. Returns a new executor. */
    setWorkers(count: number): TurboExecutor<TItem>;
    map<TResult>(fn: (item: TItem, index: number) => TResult): Promise<TResult[]>;
    mapWithStats<TResult>(fn: (item: TItem, index: number) => TResult): Promise<TurboResult<TResult>>;
    filter(fn: (item: TItem, index: number) => boolean): Promise<TItem[]>;
    reduce<TResult>(fn: (acc: TResult, item: TItem, index: number) => TResult, initialValue: TResult): Promise<TResult>;
}
/**
 * Creates a TurboExecutor for parallel array processing.
 *
 * @param data - Array or TypedArray to process
 * @param options - Turbo execution options
 * @returns TurboExecutor with map, filter, reduce methods
 *
 * @example
 * ```typescript
 * const squares = await beeThreads.turbo(numbers).map(x => x * x)
 * const evens = await beeThreads.turbo(numbers).filter(x => x % 2 === 0)
 * const sum = await beeThreads.turbo(numbers).reduce((a, b) => a + b, 0)
 * ```
 */
export declare function createTurboExecutor<TItem>(data: TItem[] | NumericTypedArray, options?: TurboOptions): TurboExecutor<TItem>;
export interface MaxOptions extends TurboOptions {
}
/**
 * @experimental
 * Creates a TurboExecutor that includes the main thread in processing.
 * Uses ALL available CPU cores including the main thread.
 *
 * WARNING: Blocks the main thread during processing. Use only when:
 * - You need 100% CPU utilization
 * - No HTTP requests/events need to be handled
 * - The workload is pure computation
 */
export declare function createMaxExecutor<TItem>(data: TItem[] | NumericTypedArray, options?: MaxOptions): TurboExecutor<TItem>;
export { MIN_ITEMS_PER_WORKER, TURBO_THRESHOLD };
//# sourceMappingURL=turbo.d.ts.map