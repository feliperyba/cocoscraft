/**
 * @fileoverview Configuration and state management for bee-threads (Browser).
 *
 * ## Why This File Exists
 *
 * Centralizes all mutable state and configuration in one place.
 * This makes it easier to:
 * - Track what state exists
 * - Reset state for testing
 * - Understand the system's global state
 *
 * ## State Categories
 *
 * 1. **Configuration** (`config`) - User-configurable settings
 * 2. **Pools** (`pools`) - Active worker instances
 * 3. **Counters** (`poolCounters`) - O(1) access to pool state
 * 4. **Queues** (`queues`) - Pending tasks waiting for workers
 * 5. **Metrics** (`metrics`) - Execution statistics
 *
 * @module bee-threads/config
 * @internal
 */
import type { Metrics, PoolConfig, PoolCounters, PoolType, PriorityQueues, WorkerEntry } from "./types";
/**
 * Global pool configuration.
 *
 * These values can be changed via `beeThreads.configure()`.
 * Changes affect new workers only (existing workers keep old config).
 *
 * @internal
 */
export declare const config: PoolConfig;
/**
 * Worker pools organized by type.
 *
 * @internal
 */
export declare const pools: Record<PoolType, WorkerEntry[]>;
/**
 * Fast counters for O(1) pool state checks.
 *
 * Instead of iterating the pool array to count busy/idle workers,
 * we maintain separate counters. This makes `getWorker()` faster
 * for the common case of checking if idle workers exist.
 *
 * @internal
 */
export declare const poolCounters: Record<PoolType, PoolCounters>;
/**
 * Task queues for when all workers are busy.
 *
 * Tasks are organized by priority (high, normal, low).
 * Within each priority, FIFO order ensures fairness.
 *
 * @internal
 */
export declare const queues: Record<PoolType, PriorityQueues>;
/**
 * Global execution metrics.
 *
 * Used for monitoring and debugging.
 * Never reset automatically (reset by calling shutdown + reinitialize).
 *
 * @internal
 */
export declare const metrics: Metrics;
//# sourceMappingURL=config.d.ts.map