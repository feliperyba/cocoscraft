/**
 * @fileoverview Worker pool management for bee-threads (Browser).
 *
 * Manages the lifecycle of Web Workers:
 * - Creating workers with Blob URLs
 * - Selecting the best worker for a task (load balancing + affinity)
 * - Returning workers to the pool after use
 * - Cleaning up idle workers to free resources
 * - Managing temporary overflow workers
 * - Counter management (busy/idle) with race-condition protection
 *
 * Selection Strategy (priority order):
 * 1. Affinity match - worker already has function cached
 * 2. Least-used idle - distributes load evenly
 * 3. Create new pooled - pool not at capacity
 * 4. Create temporary - overflow handling
 * 5. Queue task - no resources available
 *
 * ## V8 Optimizations
 *
 * - Monomorphic return shapes (stable object structure)
 * - Raw for loops instead of .find()/.filter()
 * - O(1) counter checks before array iteration
 * - Pre-allocated arrays where possible
 *
 * @module bee-threads/pool
 * @internal
 */
import type { PoolType, Priority, PriorityQueues, QueuedTask, WorkerEntry, WorkerInfo } from "./types";
export { fastHash } from "./cache";
/**
 * Creates a new Web Worker with tracking metadata.
 *
 * V8 Optimizations:
 * - WorkerEntry has stable shape (all properties initialized)
 * - Worker created from Blob URL
 */
export declare function createWorkerEntry(poolType: PoolType): WorkerEntry;
/**
 * Schedules automatic termination of idle workers.
 */
export declare function scheduleIdleTimeout(entry: WorkerEntry, poolType: PoolType): void;
/**
 * Pre-creates workers to have them ready before tasks arrive.
 */
export declare function warmupPool(poolType: PoolType, count: number): Promise<void>;
/**
 * Result of getWorker operation.
 * V8: Monomorphic shape - all properties always present.
 */
interface GetWorkerResult {
    entry: WorkerEntry | null;
    worker: Worker;
    temporary: boolean;
    affinityHit: boolean;
}
/**
 * Gets an available worker using affinity-aware load balancing.
 *
 * V8 Optimizations:
 * - Returns monomorphic object shape
 * - Uses raw for loops
 * - O(1) counter checks before iteration
 */
export declare function getWorker(poolType: PoolType, fnHash?: string | null): GetWorkerResult | null;
/**
 * Returns a worker to the pool after task completion.
 *
 * @param terminated - If true, the worker was forcefully terminated (timeout/abort)
 *                     and should be removed from pool instead of returned
 */
export declare function releaseWorker(entry: WorkerEntry | null, worker: Worker, temporary: boolean, poolType: PoolType, executionTime?: number, failed?: boolean, fnHash?: string | null, terminated?: boolean): void;
/**
 * Gets total queue length across all priorities.
 */
export declare function getQueueLength(queue: PriorityQueues): number;
/**
 * Dequeues the highest priority task.
 */
export declare function dequeueTask(queue: PriorityQueues): QueuedTask | null;
/**
 * Requests a worker, queueing if none available.
 */
export declare function requestWorker(poolType: PoolType, priority?: Priority, fnHash?: string | null): Promise<WorkerInfo>;
//# sourceMappingURL=pool.d.ts.map