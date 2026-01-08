/**
 * @fileoverview Core execution engine for bee-threads (Browser).
 *
 * ## Why This File Exists
 *
 * This is the heart of task execution. It orchestrates the entire lifecycle
 * of a task from worker acquisition to result delivery. Separating this
 * logic allows the public API (`executor.ts`) to remain clean and focused
 * on the builder pattern.
 *
 * ## What It Does
 *
 * 1. Acquires a worker from the pool (with affinity preference)
 * 2. Sends the task to the worker via postMessage
 * 3. Handles responses, errors, and timeouts
 * 4. Releases the worker back to the pool
 * 5. Tracks metrics for monitoring
 * 6. Implements retry with exponential backoff
 *
 * ## Critical Implementation Details
 *
 * ### Race Condition Prevention (v3.1.2+)
 *
 * The `settled` flag must be set BEFORE calling `worker.terminate()`.
 * This prevents a race condition where the async events could
 * fire before our timeout/abort handler completes.
 *
 * ### Error Reconstruction
 *
 * Errors are serialized in workers and reconstructed here. Custom
 * properties (code, statusCode, etc.) are preserved. Error.cause
 * and AggregateError.errors are recursively reconstructed.
 *
 * @module bee-threads/execution
 */
import type { ExecutionOptions, RetryConfig, SafeResult } from "./types";
/**
 * Executes a function once in a worker thread (no retry).
 *
 * @param fn - Function to execute
 * @param args - Arguments to pass to the function
 * @param options - Execution options
 * @param precomputedHash - Pre-computed function hash (optional, avoids recomputation)
 */
export declare function executeOnce<T = unknown>(fn: Function | {
    toString(): string;
}, args: unknown[], options?: ExecutionOptions, precomputedHash?: string): Promise<T | SafeResult<T>>;
/**
 * Executes a function with optional retry logic and exponential backoff.
 *
 * @param fn - Function to execute
 * @param args - Arguments to pass to the function
 * @param options - Execution options
 * @param precomputedHash - Pre-computed function hash (optional, avoids recomputation)
 */
export declare function execute<T = unknown>(fn: Function | {
    toString(): string;
}, args: unknown[], options?: ExecutionOptions & {
    retry?: RetryConfig;
}, precomputedHash?: string): Promise<T | SafeResult<T>>;
//# sourceMappingURL=execution.d.ts.map