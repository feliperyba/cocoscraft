/**
 * @fileoverview AutoPack - High-Performance Object ↔ TypedArray Serialization
 *
 * AutoPack converts arrays of JavaScript objects into TypedArrays for faster
 * serialization via postMessage. This provides significant performance gains
 * (1.5-10x faster) compared to the default structuredClone algorithm.
 *
 * Inspired by: Elysia, FlatBuffers, Cap'n Proto, MessagePack
 *
 * ## When to Use AutoPack
 *
 * ✅ **Good for:**
 * - Arrays with 50+ objects
 * - Objects with numeric, string, or boolean fields
 * - Nested objects (e.g., `{ user: { name: 'John' } }`)
 * - High-throughput scenarios (turbo mode)
 *
 * ❌ **Not suitable for:**
 * - Single objects (overhead > benefit)
 * - Arrays with < 50 items
 * - Objects with functions, Symbols, or BigInts
 * - Circular references
 *
 * ## Performance Benchmarks (1M objects)
 *
 * | Scenario         | structuredClone | AutoPack | Speedup |
 * |------------------|-----------------|----------|---------|
 * | Numeric objects  | 2275ms          | 698ms    | 3.3x    |
 * | String objects   | 2150ms          | 1283ms   | 1.7x    |
 * | Mixed objects    | 2114ms          | 863ms    | 2.4x    |
 * | Nested objects   | 5010ms          | 1709ms   | 2.9x    |
 *
 * ## Design Principles
 *
 * 1. **Zero-copy where possible** - SharedArrayBuffer + transfer
 * 2. **Single-pass packing** - O(n) not O(2n)
 * 3. **JIT-compiled functions** - Generated per schema for maximum speed
 * 4. **Column-oriented storage** - Cache-friendly for SIMD operations
 * 5. **Pre-parsed paths** - No string.split() overhead in hot loops
 * 6. **Schema caching** - Inference runs only once per object shape
 *
 * ## Big O Analysis
 *
 * - Schema inference: O(k) where k = number of keys (cached after first call)
 * - Pack: O(n * k) - unavoidable, but with minimal constant factor
 * - Unpack: O(n * k) - same
 * - With compiled functions: ~3-5x faster than dynamic property access
 *
 * @example
 * ```typescript
 * import { autoPack, autoUnpack } from 'bee-threads';
 *
 * const users = [
 *   { id: 1, name: 'Alice', active: true },
 *   { id: 2, name: 'Bob', active: false },
 * ];
 *
 * // Pack for transfer
 * const packed = autoPack(users);
 *
 * // Transfer to worker (much faster than structuredClone)
 * worker.postMessage(packed, getTransferables(packed));
 *
 * // Unpack in worker
 * const restored = autoUnpack(packed);
 * ```
 *
 * @module bee-threads/autopack
 */
/** Supported primitive types for AutoPack fields */
type PrimitiveType = 'number' | 'string' | 'boolean' | 'null';
/**
 * Primitive values that can be packed.
 * AutoPack only supports these types at leaf positions.
 */
type PackablePrimitive = number | string | boolean | null | undefined;
/**
 * Recursive type for objects that can be packed.
 * Allows nested objects but NOT arrays, functions, symbols, or bigint.
 */
type PackableValue = PackablePrimitive | PackableObject;
/**
 * Object type constraint for AutoPack.
 * Uses Record<string, unknown> for internal flexibility but
 * the public API enforces proper types.
 */
type PackableObject = Record<string, unknown>;
/**
 * Strict packable object for public API.
 * Use this when you want compile-time validation.
 */
export type StrictPackableObject = {
    readonly [K: string]: PackableValue;
};
/** Schema field descriptor - immutable */
interface FieldDescriptor {
    readonly name: string;
    readonly type: PrimitiveType;
    readonly path: string;
    readonly pathParts: readonly string[];
    readonly depth: number;
    readonly parentPath: string;
}
/** Compiled schema for a specific object shape - mostly immutable */
interface CompiledSchema {
    readonly hash: string;
    readonly fields: readonly FieldDescriptor[];
    readonly numericFields: readonly FieldDescriptor[];
    readonly stringFields: readonly FieldDescriptor[];
    readonly booleanFields: readonly FieldDescriptor[];
    readonly nullableFields: ReadonlySet<string>;
    readonly totalNumericCount: number;
    readonly totalStringCount: number;
    readonly totalBooleanCount: number;
    readonly maxDepth: number;
    packFn: PackFunction | null;
    unpackFn: UnpackFunction | null;
}
/** Packed data structure - transferable via postMessage */
interface PackedData<T extends PackableObject = PackableObject> {
    readonly schema: CompiledSchema;
    readonly length: number;
    numbers: Float64Array;
    strings: Uint8Array;
    stringOffsets: Uint32Array;
    stringLengths: Uint16Array;
    booleans: Uint8Array;
    nullFlags: Uint8Array;
    readonly isShared: boolean;
    readonly __type?: T;
}
/** JIT-compiled pack function signature */
type PackFunction = (data: readonly PackableObject[], packed: PackedData) => void;
/** JIT-compiled unpack function signature */
type UnpackFunction = (packed: PackedData) => PackableObject[];
/** Options for autoPack function */
interface AutoPackOptions {
    /** Use SharedArrayBuffer for zero-copy transfer. Default: false */
    readonly useSharedArrayBuffer?: boolean;
}
/**
 * Shrink internal buffers if they grew too large.
 * Call periodically or after large operations to free memory.
 *
 * @example
 * ```typescript
 * // After processing large batch
 * shrinkAutoPackBuffers();
 * ```
 */
export declare function shrinkAutoPackBuffers(): void;
/**
 * Pack an array of objects into optimized TypedArrays for fast serialization.
 *
 * AutoPack automatically:
 * - Infers the schema from the first object (cached for subsequent calls)
 * - Converts numbers to Float64Array (column-oriented for cache efficiency)
 * - Converts strings to UTF-8 Uint8Array using TextEncoder.encodeInto()
 * - Bit-packs booleans (8 per byte)
 * - Flattens nested objects (e.g., `user.name` → separate columns)
 *
 * @typeParam T - The object type in the array (must have primitive values)
 * @param data - Array of homogeneous objects to pack. All objects must have
 *               the same shape (same keys and value types).
 * @param options - Packing options
 * @param options.useSharedArrayBuffer - Use SharedArrayBuffer for zero-copy
 *        transfer between threads. Default: false
 * @returns Packed data structure containing TypedArrays (transferable via postMessage)
 *
 * @throws {TypeError} If data contains unsupported types (functions, Symbols, BigInt)
 *
 * @example Basic usage
 * ```typescript
 * const users = [
 *   { id: 1, name: 'Alice', active: true },
 *   { id: 2, name: 'Bob', active: false },
 * ];
 *
 * const packed = autoPack(users);
 * console.log(packed.numbers);  // Float64Array with id values
 * console.log(packed.strings);  // Uint8Array with encoded names
 * console.log(packed.booleans); // Uint8Array with bit-packed active flags
 * ```
 *
 * @example With SharedArrayBuffer (zero-copy)
 * ```typescript
 * const packed = autoPack(data, { useSharedArrayBuffer: true });
 * // No need to list transferables - SharedArrayBuffer is shared memory
 * worker.postMessage(packed);
 * ```
 *
 * @example Nested objects
 * ```typescript
 * const data = [
 *   { id: 1, user: { name: 'Alice', age: 30 } },
 *   { id: 2, user: { name: 'Bob', age: 25 } },
 * ];
 *
 * const packed = autoPack(data);
 * // Flattened: id, user.name, user.age as separate columns
 * ```
 *
 * @see autoUnpack - To restore objects from PackedData
 * @see getTransferables - To get ArrayBuffer list for postMessage transfer
 * @see canAutoPack - To check if data is compatible before packing
 */
/**
 * Pack an array of objects into optimized TypedArrays.
 *
 * @typeParam T - Object type (must only contain number, string, boolean, null, or nested objects)
 * @param data - Array of homogeneous objects to pack
 * @param options - Packing options
 * @returns Typed PackedData that preserves the original type T
 */
export declare function autoPack<T extends Record<string, unknown>>(data: readonly T[], options?: AutoPackOptions): PackedData<T>;
/**
 * Restore an array of objects from packed TypedArrays.
 *
 * This is the inverse of `autoPack()`. It reconstructs the original objects
 * from the column-oriented TypedArray storage, including nested objects.
 *
 * Objects are reconstructed with consistent property order (V8 hidden class
 * optimization) for better performance in subsequent operations.
 *
 * @typeParam T - The expected object type to restore
 * @param packed - Packed data structure from `autoPack()`
 * @returns Array of reconstructed objects with the original structure
 *
 * @example Basic usage
 * ```typescript
 * // In worker thread
 * const packed = /* received from main thread *\/;
 * const users = autoUnpack<User>(packed);
 *
 * // Process users...
 * const processed = users.map(u => ({ ...u, score: calculateScore(u) }));
 * ```
 *
 * @example Type safety
 * ```typescript
 * interface User {
 *   id: number;
 *   name: string;
 *   active: boolean;
 * }
 *
 * const users = autoUnpack<User>(packed);
 * // users is User[] with full type inference
 * ```
 *
 * @see autoPack - To pack objects into TypedArrays
 */
/**
 * Restore an array of objects from packed TypedArrays.
 *
 * @typeParam T - Expected object type (inferred from PackedData if available)
 * @param packed - Packed data structure from autoPack()
 * @returns Array of reconstructed objects with type T
 */
export declare function autoUnpack<T extends PackableObject>(packed: PackedData<T>): T[];
/**
 * Ultra-fast array type detection.
 *
 * PERF: CharCode lookup (no string compare), minimal branches.
 */
export declare function detectArrayType(data: unknown[]): 'number' | 'string' | 'object' | 'mixed' | 'unsupported';
/**
 * Type guard: Check if array can be packed with AutoPack.
 *
 * @param data - Array to check
 * @returns True if array contains packable objects
 *
 * PERF: Inline validation, early return, bitwise ops.
 */
export declare function canAutoPack(data: readonly unknown[]): data is readonly Record<string, unknown>[];
/**
 * Type guard: Check if value is a PackedData structure.
 */
export declare function isPackedData<T extends PackableObject = PackableObject>(value: unknown): value is PackedData<T>;
/**
 * Type guard: Check if value is a PackedNumberArray.
 */
export declare function isPackedNumberArray(value: unknown): value is PackedNumberArray;
/**
 * Type guard: Check if value is a PackedStringArray.
 */
export declare function isPackedStringArray(value: unknown): value is PackedStringArray;
/**
 * Packed number array structure.
 * V8: Stable shape, numeric type tag for fast switch.
 */
export interface PackedNumberArray {
    readonly type: 0x01;
    readonly length: number;
    readonly data: Float64Array;
}
/**
 * Pack number[] → Float64Array.
 *
 * PERF: Loop unrolling 8x, bitwise ops, zero branches in hot path.
 * Benchmark: 10M numbers in ~15ms (vs ~45ms naive)
 */
export declare function packNumberArray(numbers: number[]): PackedNumberArray;
/**
 * Unpack Float64Array → number[].
 *
 * PERF: Loop unrolling 8x, pre-allocated result array.
 */
export declare function unpackNumberArray(packed: PackedNumberArray): number[];
/**
 * Get transferable buffer.
 * V8: Direct return, no intermediate array when possible.
 */
export declare function getNumberArrayTransferables(packed: PackedNumberArray): ArrayBuffer[];
/**
 * Packed string array structure.
 * V8: Stable shape, numeric type tag.
 */
export interface PackedStringArray {
    readonly type: 0x02;
    readonly length: number;
    readonly data: Uint8Array;
    readonly offsets: Uint32Array;
    readonly lengths: Uint32Array;
}
/**
 * Pack string[] → Uint8Array (UTF-8).
 *
 * PERF:
 * - Reusable buffer (zero alloc in hot path)
 * - encodeInto (fastest UTF-8 encoder)
 * - Single pass
 * - Bitwise capacity check
 */
export declare function packStringArray(strings: string[]): PackedStringArray;
/**
 * Unpack Uint8Array (UTF-8) → string[].
 *
 * PERF: Loop unrolling 4x (limited by TextDecoder call overhead).
 */
export declare function unpackStringArray(packed: PackedStringArray): string[];
/**
 * Get transferable buffers.
 */
export declare function getStringArrayTransferables(packed: PackedStringArray): ArrayBuffer[];
/**
 * Get the list of transferable ArrayBuffers from packed data.
 *
 * Use this with `postMessage` to enable zero-copy transfer of the
 * packed data to a worker thread. After transfer, the buffers become
 * unusable in the sending thread (neutered).
 *
 * If the packed data was created with `useSharedArrayBuffer: true`,
 * this returns an empty array (SharedArrayBuffers don't need transfer).
 *
 * @param packed - Packed data from `autoPack()`
 * @returns Array of ArrayBuffers to pass as transferables
 *
 * @example
 * ```typescript
 * const packed = autoPack(users);
 * const transferables = getTransferables(packed);
 *
 * // Zero-copy transfer to worker
 * worker.postMessage(packed, transferables);
 *
 * // After transfer, packed.numbers.buffer.byteLength === 0 (neutered)
 * ```
 *
 * @example SharedArrayBuffer (no transfer needed)
 * ```typescript
 * const packed = autoPack(users, { useSharedArrayBuffer: true });
 * const transferables = getTransferables(packed); // []
 *
 * // SharedArrayBuffer is automatically shared
 * worker.postMessage(packed);
 * ```
 *
 * @see autoPack - To create packed data
 */
export declare function getTransferables<T extends PackableObject>(packed: PackedData<T>): ArrayBuffer[];
/**
 * Get statistics about AutoPack internal caches.
 *
 * Useful for monitoring memory usage and debugging performance issues.
 *
 * @returns Object containing cache statistics:
 *   - `schemaCacheSize`: Number of cached object schemas (max 64)
 *
 * @example
 * ```typescript
 * const stats = getAutoPackStats();
 * console.log(`Schema cache: ${stats.schemaCacheSize}/64 entries`);
 * ```
 */
export declare function getAutoPackStats(): {
    schemaCacheSize: number;
    encodeBufferSize: number;
    stringBufferSize: number;
    totalMemoryBytes: number;
};
/**
 * Clear all AutoPack internal caches.
 *
 * Use this for:
 * - Testing (ensure fresh state between tests)
 * - Memory pressure situations
 * - After processing data with many different schemas
 *
 * **Note:** After clearing, the next `autoPack()` call will need to
 * re-infer the schema and recompile pack/unpack functions.
 *
 * @example
 * ```typescript
 * // In tests
 * beforeEach(() => {
 *   clearAutoPackCaches();
 * });
 * ```
 */
export declare function clearAutoPackCaches(): void;
/**
 * Schema without JIT functions (can be transferred via postMessage)
 */
export interface TransferableSchema {
    hash: string;
    fields: readonly FieldDescriptor[];
    numericFields: readonly FieldDescriptor[];
    stringFields: readonly FieldDescriptor[];
    booleanFields: readonly FieldDescriptor[];
    nullableFields: string[];
    totalNumericCount: number;
    totalStringCount: number;
    totalBooleanCount: number;
    maxDepth: number;
}
/**
 * PackedData without JIT functions (can be transferred via postMessage)
 */
export interface TransferablePackedData {
    schema: TransferableSchema;
    length: number;
    numbers: Float64Array;
    strings: Uint8Array;
    stringOffsets: Uint32Array;
    stringLengths: Uint16Array;
    booleans: Uint8Array;
    nullFlags: Uint8Array;
    isShared: boolean;
}
/**
 * Convert PackedData to transferable format (removes JIT functions).
 *
 * Use this before sending PackedData to a worker via postMessage.
 * The schema's packFn/unpackFn cannot be cloned, so we strip them.
 *
 * @param packed - PackedData from autoPack()
 * @returns Transferable version without functions
 */
export declare function makeTransferable(packed: PackedData): TransferablePackedData;
/**
 * Get ArrayBuffers from TransferablePackedData for zero-copy transfer.
 */
export declare function getTransferablesFromPacked(packed: TransferablePackedData): ArrayBuffer[];
/**
 * Threshold for automatic AutoPack usage based on array length.
 * Below this, structuredClone is faster. Above this, AutoPack wins.
 *
 * Updated: 500 items threshold for consistent behavior across BUN and Node.
 */
export declare const AUTOPACK_ARRAY_THRESHOLD = 500;
/**
 * Generic unpack function code for workers (no JIT dependency).
 * Include this in worker code to enable AutoPack support.
 */
export declare const GENERIC_UNPACK_CODE = "\nfunction genericUnpack(packed) {\n  const { schema, length, numbers, strings, stringOffsets, stringLengths, booleans } = packed;\n  const { numericFields, stringFields, booleanFields } = schema;\n  \n  if (length === 0) return [];\n  \n  const result = new Array(length);\n  const decoder = new TextDecoder();\n  const numCount = numericFields.length;\n  const strCount = stringFields.length;\n  const boolCount = booleanFields.length;\n  \n  for (let i = 0; i < length; i++) {\n    const obj = {};\n    \n    // Numbers (column-oriented)\n    for (let f = 0; f < numCount; f++) {\n      obj[numericFields[f].name] = numbers[f * length + i];\n    }\n    \n    // Strings\n    for (let f = 0; f < strCount; f++) {\n      const idx = f * length + i;\n      const offset = stringOffsets[idx];\n      const len = stringLengths[idx];\n      obj[stringFields[f].name] = decoder.decode(strings.subarray(offset, offset + len));\n    }\n    \n    // Booleans (bit-packed)\n    for (let f = 0; f < boolCount; f++) {\n      const bitIndex = f * length + i;\n      const byteIndex = Math.floor(bitIndex / 8);\n      const bitOffset = bitIndex % 8;\n      obj[booleanFields[f].name] = (booleans[byteIndex] & (1 << bitOffset)) !== 0;\n    }\n    \n    result[i] = obj;\n  }\n  \n  return result;\n}\n";
/**
 * Generic pack function code for workers (simplified, no JIT).
 * Used to pack results back to main thread.
 */
export declare const GENERIC_PACK_CODE = "\nfunction genericPack(data) {\n  const len = data.length;\n  if (len === 0) return { length: 0, schema: { numericFields: [], stringFields: [], booleanFields: [] }, numbers: new Float64Array(0), strings: new Uint8Array(0), stringOffsets: new Uint32Array(0), stringLengths: new Uint16Array(0), booleans: new Uint8Array(0), nullFlags: new Uint8Array(0), isShared: false };\n  \n  const sample = data[0];\n  const keys = Object.keys(sample);\n  const numericFields = [];\n  const stringFields = [];\n  const booleanFields = [];\n  \n  for (const key of keys) {\n    const val = sample[key];\n    const type = typeof val;\n    if (type === 'number') numericFields.push({ name: key });\n    else if (type === 'string') stringFields.push({ name: key });\n    else if (type === 'boolean') booleanFields.push({ name: key });\n  }\n  \n  const numCount = numericFields.length;\n  const strCount = stringFields.length;\n  const boolCount = booleanFields.length;\n  \n  // Allocate\n  const numbers = new Float64Array(len * numCount);\n  const encoder = new TextEncoder();\n  const stringParts = [];\n  const stringOffsets = new Uint32Array(len * strCount);\n  const stringLengths = new Uint16Array(len * strCount);\n  let strOffset = 0;\n  \n  const boolBitCount = len * boolCount;\n  const booleans = new Uint8Array(Math.ceil(boolBitCount / 8));\n  \n  // Pack\n  for (let i = 0; i < len; i++) {\n    const obj = data[i];\n    \n    for (let f = 0; f < numCount; f++) {\n      numbers[f * len + i] = obj[numericFields[f].name];\n    }\n    \n    for (let f = 0; f < strCount; f++) {\n      const str = obj[stringFields[f].name] || '';\n      const encoded = encoder.encode(str);\n      stringParts.push(encoded);\n      const idx = f * len + i;\n      stringOffsets[idx] = strOffset;\n      stringLengths[idx] = encoded.length;\n      strOffset += encoded.length;\n    }\n    \n    for (let f = 0; f < boolCount; f++) {\n      if (obj[booleanFields[f].name]) {\n        const bitIndex = f * len + i;\n        const byteIndex = Math.floor(bitIndex / 8);\n        const bitOffset = bitIndex % 8;\n        booleans[byteIndex] |= (1 << bitOffset);\n      }\n    }\n  }\n  \n  // Merge strings\n  const strings = new Uint8Array(strOffset);\n  let pos = 0;\n  for (const part of stringParts) {\n    strings.set(part, pos);\n    pos += part.length;\n  }\n  \n  return {\n    schema: { numericFields, stringFields, booleanFields },\n    length: len,\n    numbers,\n    strings,\n    stringOffsets,\n    stringLengths,\n    booleans,\n    nullFlags: new Uint8Array(0),\n    isShared: false\n  };\n}\n";
export type { PackedData, CompiledSchema, FieldDescriptor, PrimitiveType, PackableObject, PackablePrimitive, PackableValue, AutoPackOptions };
//# sourceMappingURL=autopack.d.ts.map