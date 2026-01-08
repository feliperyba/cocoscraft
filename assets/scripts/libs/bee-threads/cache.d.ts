/**
 * @fileoverview LRU Cache for compiled functions using new Function().
 *
 * ## Why This File Exists
 *
 * Compiling functions has significant overhead (~0.3-0.5ms per call).
 * By caching compiled functions, repeated executions skip compilation
 * entirely (~0.001ms lookup) - a 300-500x speedup.
 *
 * ## Browser Compilation Strategy
 *
 * Uses `new Function()` for all function compilation. For context injection,
 * context variables are passed as function parameters.
 *
 * ## V8 Optimization Benefits
 *
 * Cached functions benefit from V8's optimization pipeline:
 * 1. First executions use Ignition (interpreter)
 * 2. After ~7 calls, TurboFan compiles to optimized machine code
 * 3. Cached functions retain their optimized state
 * 4. Combined with worker affinity = near-native performance
 *
 * ## LRU Strategy
 *
 * LRU (Least Recently Used) evicts the oldest unused entry when
 * the cache is full. This ensures frequently-used functions stay
 * cached while rarely-used ones are removed.
 *
 * @module bee-threads/cache
 * @internal
 */
import type { FunctionCache, LRUCache } from "./types";
/** Default maximum cache size */
export declare const DEFAULT_MAX_SIZE = 100;
/** Default TTL for cache entries in milliseconds */
export declare const DEFAULT_TTL = 0;
/**
 * Creates an LRU cache for compiled functions.
 *
 * ## How It Works
 *
 * Uses a Map to store entries. Map maintains insertion order,
 * so we can implement LRU by:
 * 1. On get: delete and re-insert to move to end (most recent)
 * 2. On set: if full, delete first entry (least recent)
 *
 * @param maxSize - Maximum number of entries
 * @param ttl - Time-to-live for entries in milliseconds (Default = 0 - no expiration)
 * @returns Cache instance with get, set, has, clear, size methods
 */
export declare function createLRUCache<T>(maxSize?: number, ttl?: number): LRUCache<T>;
/**
 * Creates a fast hash for cache keys.
 * Uses djb2 algorithm - fast and good distribution.
 *
 * @param str - String to hash
 * @returns Hash string (base36)
 */
export declare function fastHash(str: string): string;
/**
 * Creates a lightweight context key for caching.
 *
 * Instead of JSON.stringify (slow for large objects), we create
 * a composite key from:
 * - Sorted keys (for deterministic ordering)
 * - Type markers for values
 * - Primitive value hashes
 *
 * @param context - Context object
 * @returns Context key
 */
export declare function createContextKey(context: unknown, level?: number): string;
/**
 * Creates a function cache that compiles and caches functions using new Function().
 *
 * This is the main interface used by workers to cache compiled functions.
 * Uses `new Function()` for compilation with context injection via parameters.
 *
 * @param maxSize - Maximum cached functions
 * @returns Function cache with getOrCompile, clear, stats methods
 */
export declare function createFunctionCache(maxSize?: number, ttl?: number): FunctionCache;
//# sourceMappingURL=cache.d.ts.map