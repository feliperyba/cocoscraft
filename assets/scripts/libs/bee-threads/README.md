# 🐝 bee-threads (Browser)

[![npm](https://img.shields.io/npm/v/bee-threads.svg)](https://www.npmjs.com/package/bee-threads)
[![npm downloads](https://img.shields.io/npm/dw/bee-threads.svg)](https://www.npmjs.com/package/bee-threads)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/bee-threads)

<div align="center">

### ⚡ THE BEST THREADS DX FOR THE BROWSER ⚡

**Parallel programming made simple with Web Workers. Zero boilerplate. Zero dependencies.**

</div>

---

## Install

```bash
npm install bee-threads
```

**ES Modules**

```ts
import { bee, beeThreads } from "bee-threads";

// Anything inside bee() runs in a separate Web Worker
const result = await bee((x: number) => x * 2)(21); // 42
```

**Browser Script Tag (UMD)**

```html
<script src="https://unpkg.com/bee-threads/dist/bee-threads.umd.min.js"></script>
<script>
  const { bee, beeThreads } = BeeThreads;

  bee((x) => x * 2)(21).then(console.log); // 42
</script>
```

---

## `bee()` - Simple Curried API

```ts
// No arguments
await bee(() => 42)();

// With arguments
await bee((a: number, b: number) => a + b)(10, 20); // 30

// With closures
const TAX = 0.2;
await bee((price: number) => price * (1 + TAX))(100, { beeClosures: { TAX } }); // 120
```

---

## Fluent API Methods

### `beeThreads.run()` - Full Control

```ts
await beeThreads
  .run((a: number, b: number) => a + b)
  .usingParams(10, 20)
  .execute(); // 30
```

### `.setContext()` - Inject Variables

```ts
const TAX = 0.2;
await beeThreads
  .run((price: number) => price * (1 + TAX))
  .usingParams(100)
  .setContext({ TAX })
  .execute(); // 120
```

### `.signal()` - Cancellation

```ts
const controller = new AbortController();

const promise = beeThreads
  .run(() => heavyComputation())
  .signal(controller.signal)
  .execute();

controller.abort(); // Cancel anytime
```

### `.retry()` - Auto-retry

```ts
await beeThreads
  .run(() => fetchFromFlakyAPI())
  .retry({ maxAttempts: 5, baseDelay: 100, backoffFactor: 2 })
  .execute();
```

### `.priority()` - Queue Priority

```ts
await beeThreads
  .run(() => processPayment())
  .priority("high")
  .execute();
await beeThreads
  .run(() => generateReport())
  .priority("low")
  .execute();
```

### `.transfer()` - Zero-copy ArrayBuffer

```ts
const buffer = new Uint8Array(10_000_000);
await beeThreads
  .run((buf: Uint8Array) => processImage(buf))
  .usingParams(buffer)
  .transfer([buffer.buffer])
  .execute();
```

---

## `beeThreads.turbo()` - Parallel Arrays

Process arrays across **ALL CPU cores** using Web Workers. Non-blocking (main thread stays free).
Uses **SharedArrayBuffer** for zero-copy data processing when using TypedArrays!

```ts
const numbers = [1, 2, 3, 4, 5, 6, 7, 8];

const squares = await beeThreads.turbo(numbers).map((x: number) => x * x);
const evens = await beeThreads
  .turbo(numbers)
  .filter((x: number) => x % 2 === 0);
const sum = await beeThreads
  .turbo(numbers)
  .reduce((a: number, b: number) => a + b, 0);

// Custom worker count
await beeThreads
  .turbo(numbers)
  .setWorkers(8)
  .map((x: number) => x * x);

// With context
const factor = 2.5;
await beeThreads
  .turbo(data, { context: { factor } })
  .map((x: number) => x * factor);
```

> **Default workers:** `navigator.hardwareConcurrency - 1` (leaves one core for main thread)

---

## Configuration

```ts
beeThreads.configure({
  poolSize: 8,
  minThreads: 2,
  maxQueueSize: 1000,
  workerIdleTimeout: 30000,
  debugMode: true,
  logger: console,
});

await beeThreads.warmup(4);
await beeThreads.shutdown();
```

---

## Error Handling

```ts
import {
  TimeoutError,
  AbortError,
  QueueFullError,
  WorkerError,
} from "bee-threads";

try {
  await beeThreads.run(fn).execute();
} catch (err) {
  if (err instanceof TimeoutError) {
    /* timeout */
  }
  if (err instanceof AbortError) {
    /* cancelled */
  }
  if (err instanceof WorkerError) {
    /* worker error */
  }
}

// Safe mode - never throws
const result = await beeThreads.run(fn).safe().execute();
if (result.status === "fulfilled") console.log(result.value);
```

---

## When to Use

| Your Scenario                            | Best Choice | Why                            |
| ---------------------------------------- | ----------- | ------------------------------ |
| **Arrays (TypedArrays)**                 | `turbo()`   | SharedArrayBuffer = zero-copy  |
| **Single heavy function**                | `bee()`     | Keeps UI thread free           |
| **Light function** (`x * 2`)             | Main thread | Overhead > benefit             |
| **HTTP server (Wait, this is browser!)** | `bee()`     | Keeping main thread responsive |

---

## Limitations (Inline Functions)

Data is transferred via [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).

### ✅ What CAN be passed as parameters

| Type                                                                      | Works |
| ------------------------------------------------------------------------- | ----- |
| Primitives (`string`, `number`, `boolean`, `null`, `undefined`, `BigInt`) | ✅    |
| Arrays, Objects (POJOs)                                                   | ✅    |
| `Date`, `RegExp`, `Map`, `Set`                                            | ✅    |
| `ArrayBuffer`, TypedArrays (`Uint8Array`, `Float64Array`, etc.)           | ✅    |
| `Error` (with custom properties)                                          | ✅    |
| Nested objects                                                            | ✅    |

### ❌ What CANNOT be passed as parameters

| Type                    | Why                                         |
| ----------------------- | ------------------------------------------- |
| **Functions**           | Not cloneable (use `setContext` instead)    |
| **Symbols**             | Not cloneable                               |
| **Class instances**     | Lose prototype and methods                  |
| **WeakMap, WeakSet**    | Not cloneable                               |
| **Circular references** | Not supported                               |
| **DOM Elements**        | Not cloneable (cannot access DOM in worker) |

### ⚠️ Closures Must Be Explicit

Functions lose access to external variables when sent to workers:

```ts
// ❌ FAILS - x doesn't exist in worker
const x = 10;
await bee((a) => a + x)(5); // ReferenceError: x is not defined

// ✅ WORKS - pass x explicitly
const x = 10;
await bee((a) => a + x)(5, { beeClosures: { x } }); // 15
```

```ts
// ❌ FAILS - helper loses access to multiplier
const multiplier = 2;
const helper = (n) => n * multiplier;

await beeThreads
  .run((x) => helper(x))
  .setContext({ helper }) // helper is stringified, loses closure!
  .usingParams(5)
  .execute();

// ✅ WORKS - pass all dependencies
await beeThreads
  .run((x) => helper(x))
  .setContext({ helper, multiplier })
  .usingParams(5)
  .execute(); // 10
```

---

## Why bee-threads?

- **Zero dependencies** - Lightweight and secure
- **Inline functions** - No separate worker files
- **Worker pool** - Auto-managed, no cold-start
- **Function caching** - LRU cache, 300-500x faster
- **Worker affinity** - V8 JIT optimization
- **Request coalescing** - Deduplicates identical calls
- **Turbo mode** - Parallel array processing
- **Full TypeScript** - Complete type inference
- **Browser Native** - Uses `Blob` URL workers

---

## License

MIT © [Samuel Santos](https://github.com/samsantosb)
