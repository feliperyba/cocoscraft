/**
 * @fileoverview Request Coalescing (Promise Deduplication) for bee-threads.
 *
 * ## Why This File Exists
 *
 * When multiple identical requests (same function + same arguments + same context)
 * are made simultaneously, executing them all in separate workers is wasteful.
 * Request coalescing ensures only the first request actually executes, while
 * subsequent identical requests share the same Promise.
 *
 * ## How It Works
 *
 * ```
 * Request 1: bee(fn)(args) → Creates Promise, stores in cache → Executes in Worker
 * Request 2: bee(fn)(args) → Finds Promise in cache → Returns same Promise
 * Request 3: bee(fn)(args) → Finds Promise in cache → Returns same Promise
 *                                    ↓
 *                          Worker completes
 *                                    ↓
 *                    Promise resolves → Removed from cache
 *                                    ↓
 * Request 4: bee(fn)(args) → Cache empty → Creates new Promise
 * ```
 *
 * ## Benefits
 *
 * - Prevents duplicate executions of identical concurrent requests
 * - Reduces worker pool load
 * - All callers receive the same result (consistency)
 * - Zero memory overhead for completed requests (auto-cleanup)
 *
 * ## Pattern Names
 *
 * This pattern is also known as:
 * - Singleflight (Go terminology)
 * - Promise Deduplication
 * - In-flight Request Caching
 * - Request Memoization
 *
 * @module bee-threads/coalescing
 * @internal
 */
/** Statistics for request coalescing */
export interface CoalescingStats {
    /** Number of requests that were deduplicated (shared existing promise) */
    coalesced: number;
    /** Number of unique requests that created new promises */
    unique: number;
    /** Current number of in-flight promises */
    inFlight: number;
    /** Coalescing rate as percentage string */
    coalescingRate: string;
}
/**
 * Checks if a function contains non-deterministic patterns.
 * Results are cached for performance with automatic LRU-style cleanup.
 *
 * @param fnString - Function source code
 * @returns true if function appears to be non-deterministic
 */
export declare function isNonDeterministic(fnString: string): boolean;
/**
 * Clears the non-deterministic detection cache.
 * Used in testing or when memory pressure is high.
 */
export declare function clearNonDeterministicCache(): void;
/**
 * Gets an existing in-flight promise or creates a new one.
 *
 * If an identical request is already in progress, returns the existing promise.
 * Otherwise, executes the factory function and caches the resulting promise.
 * The promise is automatically removed from cache when it settles.
 *
 * Coalescing is automatically skipped for:
 * - Non-deterministic functions (Date.now, Math.random, etc.)
 * - Requests with skipCoalescing=true
 *
 * @param fnString - Function source code
 * @param args - Function arguments
 * @param context - Execution context
 * @param factory - Factory function that creates the actual promise
 * @param skipCoalescing - Force skip coalescing for this request
 * @param fnHash - Pre-computed function hash (optional, avoids recomputation)
 * @returns The (possibly shared) promise
 */
export declare function coalesce<T>(fnString: string, args: unknown[], context: Record<string, unknown> | null | undefined, factory: () => Promise<T>, skipCoalescing?: boolean, fnHash?: string): Promise<T>;
/**
 * Enables or disables request coalescing.
 *
 * @param enabled - Whether to enable coalescing
 */
export declare function setCoalescingEnabled(enabled: boolean): void;
/**
 * Returns whether coalescing is currently enabled.
 */
export declare function isCoalescingEnabled(): boolean;
/**
 * Returns coalescing statistics.
 */
export declare function getCoalescingStats(): CoalescingStats;
/**
 * Resets coalescing statistics.
 */
export declare function resetCoalescingStats(): void;
/**
 * Clears all in-flight promises (for shutdown/testing).
 * Note: Does not reject pending promises, just removes references.
 */
export declare function clearInFlightPromises(): void;
//# sourceMappingURL=coalescing.d.ts.map