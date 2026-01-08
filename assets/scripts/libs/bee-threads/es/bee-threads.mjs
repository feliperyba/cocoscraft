function I(e) {
  let t = 5381;
  for (let o = 0, r = e.length; o < r; o++)
    t = (t << 5) + t ^ e.charCodeAt(o);
  return (t >>> 0).toString(36);
}
function re(e, t = 0) {
  if (e === void 0)
    return "";
  const o = typeof e;
  if (e === null || o === "string" || o === "number" || o === "boolean")
    return String(e);
  if (e instanceof Date)
    return String(e.getTime());
  if (o === "function")
    return I(e.toString());
  if (t >= 10)
    return I(JSON.stringify(e));
  if (t++, Array.isArray(e)) {
    let a = "[", l = !0;
    for (let u = 0, g = e.length; u < g; u++) {
      const m = re(e[u], t);
      m && (l || (a += ","), a += m, l = !1);
    }
    return a + "]";
  }
  const r = Object.keys(e), s = r.length;
  if (!s)
    return "";
  s > 1 && r.sort();
  let i = "{", n = !0;
  for (let a = 0; a < s; a++) {
    const l = r[a], u = re(e[l], t);
    u && (n || (i += "&"), i += l + ":" + u, n = !1);
  }
  return i + "}";
}
const X = /* @__PURE__ */ new Map();
let ce = !0, J = 0, te = 0;
const ue = [
  // Time-based
  "Date.now",
  "new Date",
  "performance.now",
  // Random
  "Math.random",
  "crypto.randomUUID",
  "crypto.randomBytes",
  "crypto.getRandomValues",
  // Unique IDs
  "uuid",
  "nanoid",
  "cuid",
  // Process/environment (can change)
  "process.hrtime"
], Z = /* @__PURE__ */ new Map(), fe = 500;
function Fe(e) {
  const t = Z.get(e);
  if (t !== void 0)
    return t;
  let o = !1;
  for (let r = 0; r < ue.length; r++)
    if (e.includes(ue[r])) {
      o = !0;
      break;
    }
  if (Z.size >= fe) {
    const r = Math.floor(fe / 2), s = Z.keys();
    for (let i = 0; i < r; i++) {
      const n = s.next().value;
      n !== void 0 && Z.delete(n);
    }
  }
  return Z.set(e, o), o;
}
function _e(e, t, o, r) {
  const s = r ?? I(e), i = re(t), n = o ? re(o) : "";
  return `${s}:${i}:${n}`;
}
function We(e, t, o, r, s = !1, i) {
  if (!ce || s || Fe(e))
    return r();
  const n = _e(e, t, o, i), a = X.get(n);
  if (a)
    return J++, a;
  te++;
  const l = r().finally(() => {
    X.delete(n);
  });
  return X.set(n, l), l;
}
function me(e) {
  ce = e;
}
function Ie() {
  return ce;
}
function ye() {
  const e = J + te;
  return {
    coalesced: J,
    unique: te,
    inFlight: X.size,
    coalescingRate: e > 0 ? (J / e * 100).toFixed(1) + "%" : "0%"
  };
}
function Oe() {
  J = 0, te = 0;
}
function Pe() {
  X.clear();
}
function De() {
  return typeof navigator < "u" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
}
const y = {
  // Default to (CPU cores - 1) to leave one core for main thread
  // Minimum 2 to allow some parallelism even on single-core
  poolSize: Math.max(2, De() - 1),
  // Minimum workers to keep alive (warm pool)
  // These workers are never terminated by idle timeout
  minThreads: 0,
  // Queue settings
  maxQueueSize: 1e3,
  maxTemporaryWorkers: 10,
  // Worker lifecycle
  workerIdleTimeout: 3e4,
  // 30 seconds
  // Function cache size per worker (for compiled functions)
  functionCacheSize: 100,
  /**
   * Low memory mode for memory-constrained environments.
   *
   * When enabled:
   * - Function cache size reduced to 10 (default: 100) → ~35-50% less memory
   * - Validation cache disabled → ~10-20% less memory
   * - Worker affinity tracking disabled → ~15-25% less memory
   *
   * Total reduction: ~60-80% less memory
   * Trade-off: Slower repeated executions (no caching benefits)
   *
   * Use cases: Mobile devices, memory-constrained environments
   */
  lowMemoryMode: !1,
  // Resource limits (advisory in browser, not enforced like Node.js)
  resourceLimits: {
    maxOldGenerationSizeMb: 512,
    maxYoungGenerationSizeMb: 128,
    codeRangeSizeMb: 64
  },
  // Retry defaults (disabled by default)
  retry: {
    enabled: !1,
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 5e3,
    backoffFactor: 2
  },
  /**
   * Debug mode for development.
   *
   * When enabled:
   * - Function source code included in error messages
   * - More verbose error logging in workers
   */
  debugMode: !1,
  /**
   * Logger for worker log forwarding.
   * Default: console
   * Set to null to disable logging.
   */
  logger: typeof console < "u" ? console : null,
  /**
   * Security configuration (transparent - doesn't affect normal usage).
   */
  security: {
    // 1MB max function size - prevents DoS via huge functions
    maxFunctionSize: 1024 * 1024,
    // Block prototype pollution attacks
    blockPrototypePollution: !0
  }
}, B = {
  normal: []
}, N = {
  normal: { busy: 0, idle: 0 }
}, U = {
  normal: { high: [], normal: [], low: [] }
}, L = {
  totalTasksExecuted: 0,
  totalTasksFailed: 0,
  totalRetries: 0,
  temporaryWorkersCreated: 0,
  activeTemporaryWorkers: 0,
  temporaryWorkerExecutionTime: 0,
  temporaryWorkerTasks: 0,
  // Affinity metrics
  affinityHits: 0,
  affinityMisses: 0
};
class K extends Error {
  /** Machine-readable error code */
  code;
  /**
   * Creates a new AsyncThreadError.
   *
   * @param message - Human-readable error message
   * @param code - Machine-readable error code (e.g., 'ERR_TIMEOUT')
   */
  constructor(t, o) {
    super(t), this.name = "AsyncThreadError", this.code = o, Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
  }
}
class ee extends K {
  /**
   * Creates a new AbortError.
   *
   * @param message - Error message (default: 'Operation was aborted')
   */
  constructor(t = "Operation was aborted") {
    super(t, "ERR_ABORTED"), this.name = "AbortError";
  }
}
class ae extends K {
  /** The timeout value in milliseconds */
  timeout;
  /**
   * Creates a new TimeoutError.
   *
   * @param ms - The timeout value that was exceeded (in milliseconds)
   */
  constructor(t) {
    super(`Worker timed out after ${t}ms`, "ERR_TIMEOUT"), this.name = "TimeoutError", this.timeout = t;
  }
}
class Ne extends K {
  /** Maximum queue size configured */
  maxSize;
  /**
   * Creates a new QueueFullError.
   *
   * @param maxSize - The maximum queue size that was reached
   */
  constructor(t) {
    super(`Task queue full (max ${t})`, "ERR_QUEUE_FULL"), this.name = "QueueFullError", this.maxSize = t;
  }
}
class de extends K {
  /**
   * Creates a new WorkerError.
   *
   * @param message - Error message from the worker
   * @param originalError - The original error that caused this
   */
  constructor(t, o) {
    super(t, "ERR_WORKER"), this.name = "WorkerError", o && (this.cause = o, this.stack = o.stack || this.stack);
  }
}
const He = `
// ============================================================================
// MESSAGE TYPES
// ============================================================================

const MessageType = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOG: 'log'
};

const LogLevel = {
  LOG: 'log',
  WARN: 'warn',
  ERROR: 'error',
  INFO: 'info',
  DEBUG: 'debug'
};

// ============================================================================
// WORKER CONFIG (from workerData equivalent)
// ============================================================================

let workerConfig = {
  functionCacheSize: 100,
  lowMemoryMode: false,
  debugMode: false
};

// Current function being executed (for debug)
let currentFnSource = null;

// ============================================================================
// FUNCTION CACHE (LRU)
// ============================================================================

const fnCache = new Map();
const MAX_CACHE_SIZE = workerConfig.functionCacheSize;

// Reconstructed function cache
const reconstructedFnCache = new Map();
const RECONSTRUCTED_FN_CACHE_SIZE = 64;

// Function cache stats
let cacheHits = 0;
let cacheMisses = 0;

function reconstructFunctions(context) {
  const result = {};
  const keys = Object.keys(context);
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    const value = context[key];
    if (typeof value === 'string' && value.startsWith('__BEE_FN__:')) {
      const fnStr = value.slice(11);
      let fn = reconstructedFnCache.get(fnStr);
      if (!fn) {
        try {
          fn = new Function('return (' + fnStr + ')')();
          if (reconstructedFnCache.size >= RECONSTRUCTED_FN_CACHE_SIZE) {
            const firstKey = reconstructedFnCache.keys().next().value;
            if (firstKey) reconstructedFnCache.delete(firstKey);
          }
          reconstructedFnCache.set(fnStr, fn);
        } catch (e) {
          throw new Error('Failed to reconstruct function "' + key + '": ' + e.message);
        }
      }
      result[key] = fn;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function fastHash(str) {
  let hash = 5381;
  for (let i = 0, len = str.length; i < len; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function createContextKey(context, level) {
  level = level || 0;
  if (context === undefined) return '';
  const ctxType = typeof context;
  if (context === null || ctxType === 'string' || ctxType === 'number' || ctxType === 'boolean') {
    return String(context);
  }
  if (context instanceof Date) {
    return String(context.getTime());
  }
  if (ctxType === 'function') {
    return fastHash(context.toString());
  }
  if (level >= 10) {
    return fastHash(JSON.stringify(context));
  }
  level++;
  if (Array.isArray(context)) {
    let arrResult = '[';
    let first = true;
    for (let i = 0, len = context.length; i < len; i++) {
      const itemKey = createContextKey(context[i], level);
      if (itemKey) {
        if (!first) arrResult += ',';
        arrResult += itemKey;
        first = false;
      }
    }
    return arrResult + ']';
  }
  const keys = Object.keys(context);
  const keysLen = keys.length;
  if (!keysLen) return '';
  if (keysLen > 1) keys.sort();
  let objResult = '{';
  let first = true;
  for (let i = 0; i < keysLen; i++) {
    const key = keys[i];
    const value = createContextKey(context[key], level);
    if (value) {
      if (!first) objResult += '&';
      objResult += key + ':' + value;
      first = false;
    }
  }
  return objResult + '}';
}

function getOrCompile(fnString, context) {
  let hasContext = false;
  if (context) {
    for (const _ in context) { hasContext = true; break; }
  }

  const contextKey = hasContext ? createContextKey(context) : '';
  const cacheKey = contextKey ? fnString + '::' + contextKey : fnString;

  let fn = fnCache.get(cacheKey);
  if (fn) {
    cacheHits++;
    // LRU: move to end
    fnCache.delete(cacheKey);
    fnCache.set(cacheKey, fn);
    return fn;
  }

  cacheMisses++;

  if (!hasContext) {
    fn = new Function('return ' + fnString)();
  } else {
    const processedContext = reconstructFunctions(context);
    const contextKeys = Object.keys(processedContext);
    const contextValues = contextKeys.map(function(k) { return processedContext[k]; });
    const wrapperFn = new Function(...contextKeys, 'return (' + fnString + ')');
    fn = wrapperFn(...contextValues);
  }

  fnCache.set(cacheKey, fn);

  // LRU eviction
  if (fnCache.size > MAX_CACHE_SIZE) {
    const oldestKey = fnCache.keys().next().value;
    if (oldestKey !== undefined) {
      fnCache.delete(oldestKey);
    }
  }

  return fn;
}

// ============================================================================
// CONSOLE REDIRECTION
// ============================================================================

function argsToStrings(args) {
  const len = args.length;
  const result = new Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = String(args[i]);
  }
  return result;
}

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

console.log = function() {
  const args = Array.prototype.slice.call(arguments);
  self.postMessage({ type: MessageType.LOG, level: LogLevel.LOG, args: argsToStrings(args) });
};

console.warn = function() {
  const args = Array.prototype.slice.call(arguments);
  self.postMessage({ type: MessageType.LOG, level: LogLevel.WARN, args: argsToStrings(args) });
};

console.error = function() {
  const args = Array.prototype.slice.call(arguments);
  self.postMessage({ type: MessageType.LOG, level: LogLevel.ERROR, args: argsToStrings(args) });
};

console.info = function() {
  const args = Array.prototype.slice.call(arguments);
  self.postMessage({ type: MessageType.LOG, level: LogLevel.INFO, args: argsToStrings(args) });
};

console.debug = function() {
  const args = Array.prototype.slice.call(arguments);
  self.postMessage({ type: MessageType.LOG, level: LogLevel.DEBUG, args: argsToStrings(args) });
};

// ============================================================================
// ERROR SERIALIZATION
// ============================================================================

function serializeError(e) {
  const serialized = {
    name: 'Error',
    message: '',
    stack: undefined,
    _sourceCode: (workerConfig.debugMode && currentFnSource) ? currentFnSource : undefined,
    cause: undefined,
    errors: undefined
  };

  if (e && typeof e === 'object' && 'name' in e && 'message' in e) {
    serialized.name = String(e.name);
    serialized.message = String(e.message);
    serialized.stack = e.stack;
    
    if ('cause' in e && e.cause != null) {
      serialized.cause = serializeError(e.cause);
    }
    
    if ('errors' in e && Array.isArray(e.errors)) {
      const errArray = e.errors;
      const len = errArray.length;
      const serializedErrors = new Array(len);
      for (let j = 0; j < len; j++) {
        serializedErrors[j] = serializeError(errArray[j]);
      }
      serialized.errors = serializedErrors;
    }
    
    const errObjKeys = Object.keys(e);
    for (let i = 0, len = errObjKeys.length; i < len; i++) {
      const key = errObjKeys[i];
      if (key !== 'name' && key !== 'message' && key !== 'stack' && key !== 'cause' && key !== 'errors') {
        const value = e[key];
        if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          serialized[key] = value;
        }
      }
    }
  } else if (e instanceof Error) {
    serialized.name = e.name;
    serialized.message = e.message;
    serialized.stack = e.stack;
    if (e.cause != null) {
      serialized.cause = serializeError(e.cause);
    }
  } else {
    serialized.message = String(e);
  }
  
  return serialized;
}

// ============================================================================
// FUNCTION VALIDATION
// ============================================================================

const VALID_FUNCTION_PATTERNS = [
  /^function\\s*\\w*\\s*\\(/,
  /^async\\s+function\\s*\\w*\\s*\\(/,
  /^\\(.*\\)\\s*=>/,
  /^\\w+\\s*=>/,
  /^async\\s*\\(.*\\)\\s*=>/,
  /^async\\s+\\w+\\s*=>/,
  /^\\(\\s*\\[/,
  /^\\(\\s*\\{/
];
const PATTERNS_LEN = VALID_FUNCTION_PATTERNS.length;

const validatedSources = new Set();
const MAX_VALIDATION_CACHE = 200;

function validateFunctionSource(src) {
  if (typeof src !== 'string') {
    throw new TypeError('Function source must be a string');
  }

  if (!workerConfig.lowMemoryMode && validatedSources.has(src)) {
    return;
  }

  const firstChar = src.charCodeAt(0);
  const trimmed = (firstChar === 32 || firstChar === 9 || firstChar === 10 || firstChar === 13)
    ? src.trim()
    : src;

  let isValid = false;
  for (let i = 0; i < PATTERNS_LEN; i++) {
    if (VALID_FUNCTION_PATTERNS[i].test(trimmed)) {
      isValid = true;
      break;
    }
  }
  if (!isValid) {
    throw new TypeError('Invalid function source');
  }

  if (!workerConfig.lowMemoryMode) {
    if (validatedSources.size >= MAX_VALIDATION_CACHE) {
      validatedSources.clear();
    }
    validatedSources.add(src);
  }
}

// ============================================================================
// CURRIED FUNCTION SUPPORT
// ============================================================================

function applyCurried(fn, args) {
  const argsLen = args ? args.length : 0;
  if (argsLen === 0) {
    return fn();
  }

  let result = fn.apply(null, args);

  if (typeof result === 'function' && argsLen > 1) {
    result = fn;
    for (let i = 0; i < argsLen; i++) {
      if (typeof result !== 'function') break;
      result = result(args[i]);
    }
  }

  return result;
}

// ============================================================================
// TURBO MODE HANDLER
// ============================================================================

function isTurboMessage(msg) {
  return msg !== null && typeof msg === 'object' && 'type' in msg &&
    (msg.type === 'turbo_map' || msg.type === 'turbo_filter' || msg.type === 'turbo_reduce');
}

function handleTurboMessage(message) {
  const type = message.type;
  const fnSrc = message.fn;
  const chunk = message.chunk;
  const startIndex = message.startIndex;
  const endIndex = message.endIndex;
  const context = message.context;
  const inputBuffer = message.inputBuffer;
  const outputBuffer = message.outputBuffer;
  const turboControl = message.controlBuffer;
  const initialValue = message.initialValue;

  try {
    const fn = getOrCompile(fnSrc, context);

    if (typeof fn !== 'function') {
      throw new TypeError('Turbo function did not compile correctly');
    }

    // SharedArrayBuffer mode (for TypedArrays)
    if (inputBuffer && outputBuffer) {
      const inputView = new Float64Array(inputBuffer);
      const outputView = new Float64Array(outputBuffer);
      const start = startIndex !== undefined ? startIndex : 0;
      const end = endIndex !== undefined ? endIndex : inputView.length;

      if (type === 'turbo_map') {
        for (let i = start; i < end; i++) {
          outputView[i] = fn(inputView[i], i);
        }
      }

      if (turboControl) {
        const cv = new Int32Array(turboControl);
        Atomics.add(cv, 0, 1);
        Atomics.notify(cv, 0);
      }

      self.postMessage({
        type: 'turbo_complete',
        workerId: message.workerId,
        itemsProcessed: end - start
      });
      return;
    }

    // Regular chunk
    if (!chunk) {
      throw new Error('Turbo message missing chunk data');
    }
    
    const chunkLen = chunk.length;
    let result;

    if (type === 'turbo_map') {
      result = new Array(chunkLen);
      for (let i = 0; i < chunkLen; i++) {
        result[i] = fn(chunk[i], i);
      }
    } else if (type === 'turbo_filter') {
      result = [];
      for (let i = 0; i < chunkLen; i++) {
        if (fn(chunk[i], i)) {
          result.push(chunk[i]);
        }
      }
    } else if (type === 'turbo_reduce') {
      let acc = initialValue;
      for (let i = 0; i < chunkLen; i++) {
        acc = fn(acc, chunk[i], i);
      }
      result = [acc];
    } else {
      throw new Error('Unknown turbo type: ' + type);
    }

    self.postMessage({
      type: 'turbo_complete',
      workerId: message.workerId,
      result: result,
      itemsProcessed: chunkLen
    });
    return;

  } catch (e) {
    self.postMessage({
      type: 'turbo_error',
      workerId: message.workerId,
      error: serializeError(e),
      itemsProcessed: 0
    });
  }
}

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

function processMessage(message) {
  // Handle config message
  if (message && message.type === 'config') {
    if (message.functionCacheSize !== undefined) {
      workerConfig.functionCacheSize = message.functionCacheSize;
    }
    if (message.lowMemoryMode !== undefined) {
      workerConfig.lowMemoryMode = message.lowMemoryMode;
    }
    if (message.debugMode !== undefined) {
      workerConfig.debugMode = message.debugMode;
    }
    return;
  }

  // Handle turbo messages
  if (isTurboMessage(message)) {
    handleTurboMessage(message);
    return;
  }

  const src = message.fn;
  const args = message.args;
  const context = message.context;
  
  currentFnSource = src;
  
  try {
    validateFunctionSource(src);
    const fn = getOrCompile(src, context);

    if (typeof fn !== 'function') {
      throw new TypeError('Evaluated source did not produce a function');
    }

    const ret = applyCurried(fn, args);

    if (ret && typeof ret === 'object' && 'then' in ret && typeof ret.then === 'function') {
      ret
        .then(function(v) {
          self.postMessage({ type: MessageType.SUCCESS, value: v });
        })
        .catch(function(e) {
          self.postMessage({ type: MessageType.ERROR, error: serializeError(e) });
        })
        .finally(function() {
          currentFnSource = null;
        });
    } else {
      self.postMessage({ type: MessageType.SUCCESS, value: ret });
      currentFnSource = null;
    }
  } catch (e) {
    self.postMessage({ type: MessageType.ERROR, error: serializeError(e) });
    currentFnSource = null;
  }
}

// ============================================================================
// MESSAGE LOOP
// ============================================================================

self.onmessage = function(e) {
  processMessage(e.data);
};

// Global error handler
self.onerror = function(e) {
  self.postMessage({
    type: MessageType.ERROR,
    error: serializeError(e)
  });
};
`;
function je() {
  const e = new Blob([He], { type: "application/javascript" });
  return URL.createObjectURL(e);
}
let se = null;
function ke() {
  return se || (se = je()), se;
}
let Be = 0;
function we(e) {
  const t = ke(), o = new Worker(t);
  o.postMessage({
    type: "config",
    functionCacheSize: y.lowMemoryMode ? 10 : y.functionCacheSize,
    lowMemoryMode: y.lowMemoryMode,
    debugMode: y.debugMode
  });
  const r = {
    worker: o,
    busy: !1,
    id: ++Be,
    tasksExecuted: 0,
    totalExecutionTime: 0,
    failedTasks: 0,
    temporary: !1,
    terminationTimer: null,
    cachedFunctions: /* @__PURE__ */ new Set(),
    messageHandler: null,
    errorHandler: null
  }, s = (i) => {
    const n = B[e], a = n.length;
    let l = -1;
    for (let u = 0; u < a; u++)
      if (n[u] === r) {
        l = u;
        break;
      }
    l !== -1 && (n.splice(l, 1), r.busy ? N[e].busy-- : N[e].idle--), o.terminate();
  };
  return o.addEventListener("error", s), r.errorHandler = s, N[e].idle++, r;
}
function Ue(e, t) {
  y.workerIdleTimeout <= 0 || (e.terminationTimer && clearTimeout(e.terminationTimer), e.terminationTimer = setTimeout(() => {
    const o = B[t], r = y.minThreads > 1 ? y.minThreads : 1;
    if (!e.busy && o.length > r) {
      const s = o.length;
      let i = -1;
      for (let n = 0; n < s; n++)
        if (o[n] === e) {
          i = n;
          break;
        }
      i !== -1 && (o.splice(i, 1), N[t].idle--), e.worker.terminate();
    }
  }, y.workerIdleTimeout));
}
async function Ke(e, t) {
  const o = B[e], s = (y.poolSize < t ? y.poolSize : t) - o.length;
  for (let i = 0; i < s; i++) {
    const n = we(e);
    o.push(n);
  }
}
function Ve(e, t = null) {
  const o = B[e], r = N[e], s = o.length;
  if (t && r.idle > 0) {
    for (let i = 0; i < s; i++) {
      const n = o[i];
      if (!n.busy && n.cachedFunctions.has(t))
        return n.busy = !0, r.busy++, r.idle--, n.terminationTimer && (clearTimeout(n.terminationTimer), n.terminationTimer = null), L.affinityHits++, {
          entry: n,
          worker: n.worker,
          temporary: !1,
          affinityHit: !0
        };
    }
    L.affinityMisses++;
  }
  if (r.idle > 0) {
    let i = null, n = 1 / 0;
    for (let a = 0; a < s; a++) {
      const l = o[a];
      if (!l.busy) {
        if (l.tasksExecuted === 0) {
          i = l;
          break;
        }
        l.tasksExecuted < n && (n = l.tasksExecuted, i = l);
      }
    }
    if (i)
      return i.busy = !0, r.busy++, r.idle--, i.terminationTimer && (clearTimeout(i.terminationTimer), i.terminationTimer = null), {
        entry: i,
        worker: i.worker,
        temporary: !1,
        affinityHit: !1
      };
  }
  if (s < y.poolSize) {
    const i = we(e);
    return i.busy = !0, r.idle--, r.busy++, o.push(i), {
      entry: i,
      worker: i.worker,
      temporary: !1,
      affinityHit: !1
    };
  }
  if (L.activeTemporaryWorkers < y.maxTemporaryWorkers) {
    const i = ke(), n = new Worker(i);
    return n.postMessage({
      type: "config",
      functionCacheSize: y.functionCacheSize,
      lowMemoryMode: y.lowMemoryMode,
      debugMode: y.debugMode
    }), n._temporary = !0, n._startTime = Date.now(), L.temporaryWorkersCreated++, L.activeTemporaryWorkers++, {
      entry: null,
      worker: n,
      temporary: !0,
      affinityHit: !1
    };
  }
  return null;
}
function H(e, t, o, r, s = 0, i = !1, n = null, a = !1) {
  if (o) {
    L.activeTemporaryWorkers--, L.temporaryWorkerTasks++, L.temporaryWorkerExecutionTime += s, a || t.terminate();
    return;
  }
  if (!e)
    return;
  const l = N[r], u = B[r];
  if (e.tasksExecuted++, e.totalExecutionTime += s, i && e.failedTasks++, a) {
    e.terminationTimer && (clearTimeout(e.terminationTimer), e.terminationTimer = null);
    const b = u.length;
    let p = -1;
    for (let d = 0; d < b; d++)
      if (u[d] === e) {
        p = d;
        break;
      }
    p !== -1 && (u.splice(p, 1), e.busy ? l.busy-- : l.idle--);
    return;
  }
  n && !y.lowMemoryMode && (e.cachedFunctions.size >= 50 && e.cachedFunctions.clear(), e.cachedFunctions.add(n));
  const g = U[r], m = Ge(g);
  m && e.busy ? (e.terminationTimer && (clearTimeout(e.terminationTimer), e.terminationTimer = null), m.resolve({ entry: e, worker: e.worker, temporary: !1 })) : e.busy && (e.busy = !1, l.busy--, l.idle++, Ue(e, r));
}
function pe(e) {
  return e.high.length + e.normal.length + e.low.length;
}
function Ge(e) {
  return e.high.length > 0 ? e.high.shift() : e.normal.length > 0 ? e.normal.shift() : e.low.length > 0 ? e.low.shift() : null;
}
function j(e, t = "normal", o = null) {
  const r = Ve(e, o);
  if (r)
    return Promise.resolve({
      worker: r.worker,
      entry: r.entry,
      temporary: r.temporary
    });
  const s = U[e];
  if (pe(s) >= y.maxQueueSize)
    return Promise.reject(new Ne(y.maxQueueSize));
  const i = t === "high" || t === "normal" || t === "low" ? t : "normal";
  return new Promise((n, a) => {
    const l = {
      fnString: "",
      args: [],
      context: null,
      transfer: [],
      resolve: (u) => n(u),
      reject: a,
      priority: i
    };
    s[i].push(l);
  });
}
const ie = {
  /** Successful task completion */
  SUCCESS: "success",
  /** Task error */
  ERROR: "error",
  /** Console log forwarding */
  LOG: "log"
}, lr = {
  log: () => {
  },
  warn: () => {
  },
  error: () => {
  },
  info: () => {
  },
  debug: () => {
  }
};
function be(e) {
  if (e === null || typeof e != "object")
    return e;
  const t = Object.keys(e);
  for (let o = 0, r = t.length; o < r; o++) {
    const s = e[t[o]];
    typeof s == "object" && s !== null && be(s);
  }
  return Object.freeze(e);
}
const qe = (e) => new Promise((t) => setTimeout(t, e));
function Qe(e, t, o, r) {
  const s = Math.min(t * Math.pow(r, e), o), i = s * 0.25 * (Math.random() * 2 - 1);
  return Math.round(s + i);
}
function ne(e) {
  if (e == null || e instanceof Uint8Array)
    return e;
  if (Array.isArray(e)) {
    let t = !1;
    const o = new Array(e.length);
    for (let r = 0; r < e.length; r++) {
      const s = e[r], i = ne(s);
      o[r] = i, i !== s && (t = !0);
    }
    return t ? o : e;
  }
  if (typeof e == "object" && e.constructor === Object) {
    let t = !1;
    const o = {}, r = Object.keys(e);
    for (let s = 0; s < r.length; s++) {
      const i = r[s], n = e[i], a = ne(n);
      o[i] = a, a !== n && (t = !0);
    }
    return t ? o : e;
  }
  return e;
}
async function ge(e, t, o = {}, r) {
  const {
    safe: s = !1,
    timeout: i = null,
    poolType: n = "normal",
    transfer: a = [],
    signal: l = null,
    context: u = null,
    priority: g = "normal"
  } = o, m = Date.now(), b = e.toString(), p = r ?? I(b);
  if (l?.aborted) {
    const c = new ee(l.reason?.message);
    if (s)
      return { status: "rejected", error: c };
    throw c;
  }
  let d;
  try {
    d = await j(n, g, p);
  } catch (c) {
    if (s)
      return { status: "rejected", error: c };
    throw c;
  }
  const { entry: k, worker: h, temporary: C } = d;
  return new Promise((c, T) => {
    let f = !1, z, S, v = null, E = null;
    const w = (R, A = !1) => {
      f || (f = !0, z && clearTimeout(z), l && S && l.removeEventListener("abort", S), v && h.removeEventListener("message", v), E && h.removeEventListener("error", E), H(
        k,
        h,
        C,
        n,
        R,
        A,
        p
      ));
    }, M = (R, A) => {
      f || (w(Date.now() - m, !R), R ? L.totalTasksExecuted++ : L.totalTasksFailed++, s ? c(
        R ? { status: "fulfilled", value: A } : { status: "rejected", error: A }
      ) : R ? c(A) : T(A));
    }, F = (R) => {
      const A = new de(String(R.message || ""));
      if (A.name = String(R.name || "Error"), R.stack && (A.stack = String(R.stack)), R.cause && typeof R.cause == "object" && (A.cause = F(
        R.cause
      )), Array.isArray(R.errors)) {
        const x = R.errors, P = new Array(x.length);
        for (let W = 0, $ = x.length; W < $; W++)
          P[W] = F(
            x[W]
          );
        A.errors = P;
      }
      const _ = Object.keys(R);
      for (let x = 0, P = _.length; x < P; x++) {
        const W = _[x];
        W !== "name" && W !== "message" && W !== "stack" && W !== "_sourceCode" && W !== "cause" && W !== "errors" && (A[W] = R[W]);
      }
      return A;
    };
    v = (R) => {
      const A = R.data;
      if ("type" in A && A.type === ie.LOG) {
        const _ = A;
        if (y.logger) {
          const x = y.logger[_.level];
          typeof x == "function" ? x("[worker]", ..._.args) : y.logger.log("[worker]", ..._.args);
        }
        return;
      }
      if ("type" in A) {
        if (A.type === ie.SUCCESS) {
          const _ = A.value, x = o.reconstructBuffers ? ne(_) : _;
          M(!0, x);
        } else if (A.type === ie.ERROR) {
          const _ = A, x = F(
            _.error
          );
          y.debugMode && _.error._sourceCode && y.logger && y.logger.error(
            `[bee-threads] Failed function:
`,
            _.error._sourceCode
          ), M(!1, x);
        }
        return;
      }
      if ("ok" in A)
        if (A.ok) {
          const _ = A.value, x = o.reconstructBuffers ? ne(_) : _;
          M(!0, x);
        } else {
          const _ = F(
            A.error
          );
          M(!1, _);
        }
    }, E = (R) => {
      M(!1, new de(R.message || "Worker error"));
    }, l && (S = () => {
      f || (f = !0, z && clearTimeout(z), v && h.removeEventListener("message", v), E && h.removeEventListener("error", E), h.terminate(), H(
        k,
        h,
        C,
        n,
        Date.now() - m,
        !0,
        p,
        !0
      ), L.totalTasksFailed++, s ? c({
        status: "rejected",
        error: new ee(l.reason?.message)
      }) : T(new ee(l.reason?.message)));
    }, l.addEventListener("abort", S)), i && (z = setTimeout(() => {
      f || (f = !0, l && S && l.removeEventListener("abort", S), v && h.removeEventListener("message", v), E && h.removeEventListener("error", E), h.terminate(), H(
        k,
        h,
        C,
        n,
        Date.now() - m,
        !0,
        p,
        !0
      ), L.totalTasksFailed++, s ? c({ status: "rejected", error: new ae(i) }) : T(new ae(i)));
    }, i)), h.addEventListener("message", v), h.addEventListener("error", E);
    const O = { fn: b, args: t, context: u };
    a.length > 0 ? h.postMessage(O, a) : h.postMessage(O);
  });
}
async function q(e, t, o = {}, r) {
  const {
    retry: s = y.retry,
    safe: i = !1,
    context: n = null,
    skipCoalescing: a = !1
  } = o, l = e.toString(), u = r ?? I(l), g = !o.signal, m = async () => {
    if (!s?.enabled)
      return ge(e, t, o, u);
    const { maxAttempts: b, baseDelay: p, maxDelay: d, backoffFactor: k } = s;
    let h;
    for (let c = 0, T = b; c < T; c++)
      try {
        const f = await ge(
          e,
          t,
          { ...o, safe: !1 },
          u
        );
        return i ? { status: "fulfilled", value: f } : f;
      } catch (f) {
        if (h = f, f instanceof ee || f instanceof ae)
          break;
        c < b - 1 && (L.totalRetries++, await qe(
          Qe(c, p, d, k)
        ));
      }
    const C = h ?? new Error("All retry attempts failed");
    if (i)
      return { status: "rejected", error: C };
    throw C;
  };
  return g ? await We(
    l,
    t,
    n,
    m,
    a,
    u
  ) : await m();
}
function $e(e) {
  if (typeof e != "function")
    throw new TypeError(`Expected a function, got ${typeof e}`);
}
function Ze(e) {
  if (typeof e != "number" || !Number.isFinite(e) || e <= 0)
    throw new TypeError("Timeout must be a positive finite number");
}
function Xe(e) {
  if (typeof e != "number" || !Number.isInteger(e) || e < 1)
    throw new TypeError("Pool size must be a positive integer >= 1");
}
function Te(e, t) {
  const r = new TextEncoder().encode(e).length;
  if (r > t)
    throw new RangeError(
      `Function source exceeds maximum size (${r} bytes > ${t} bytes limit)`
    );
}
function oe(e) {
  if (Object.prototype.hasOwnProperty.call(e, "__proto__"))
    throw new TypeError(
      'Context key "__proto__" is not allowed (potential prototype pollution)'
    );
  const t = Object.keys(e);
  for (let o = 0; o < t.length; o++) {
    const r = t[o];
    if (r === "constructor" || r === "prototype")
      throw new TypeError(
        `Context key "${r}" is not allowed (potential prototype pollution)`
      );
  }
}
function D(e) {
  const { fnString: t, fnHash: o, options: r, args: s } = e;
  return {
    /**
     * Sets the arguments to pass to the function.
     */
    usingParams(...n) {
      return D({
        fnString: t,
        fnHash: o,
        options: r,
        args: s.length > 0 ? s.concat(n) : n
      });
    },
    /**
     * Injects external variables into the function's scope.
     * Functions are automatically serialized and reconstructed in the worker.
     * 
     * @example
     * ```typescript
     * import { helper } from './utils';
     * 
     * await bee((data) => data.map(helper))
     *   .setContext({ helper })  // Functions work now!
     *   (myArray);
     * ```
     */
    setContext(n) {
      if (typeof n != "object" || n === null)
        throw new TypeError("setContext() requires a non-null object");
      y.security.blockPrototypePollution && oe(n);
      const a = {}, l = Object.keys(n);
      for (let u = 0, g = l.length; u < g; u++) {
        const m = l[u], b = n[m];
        if (typeof b == "function")
          a[m] = `__BEE_FN__:${b.toString()}`;
        else {
          if (typeof b == "symbol")
            throw new TypeError(
              `setContext() key "${m}" contains a Symbol which cannot be serialized.`
            );
          a[m] = b;
        }
      }
      return D({
        fnString: t,
        fnHash: o,
        options: { ...r, context: a },
        args: s
      });
    },
    /**
     * Attaches an AbortSignal for cancellation support.
     */
    signal(n) {
      return D({
        fnString: t,
        fnHash: o,
        options: { ...r, signal: n },
        args: s
      });
    },
    /**
     * Specifies transferable objects for zero-copy transfer.
     */
    transfer(n) {
      return D({
        fnString: t,
        fnHash: o,
        options: { ...r, transfer: n },
        args: s
      });
    },
    /**
     * Enables automatic retry with exponential backoff.
     */
    retry(n = {}) {
      const a = {
        enabled: !0,
        maxAttempts: n.maxAttempts ?? y.retry.maxAttempts,
        baseDelay: n.baseDelay ?? y.retry.baseDelay,
        maxDelay: n.maxDelay ?? y.retry.maxDelay,
        backoffFactor: n.backoffFactor ?? y.retry.backoffFactor
      };
      return D({
        fnString: t,
        fnHash: o,
        options: {
          ...r,
          retry: a
        },
        args: s
      });
    },
    /**
     * Sets the task priority for queue ordering.
     */
    priority(n) {
      if (n !== "high" && n !== "normal" && n !== "low")
        throw new TypeError(`Invalid priority "${n}". Use: high, normal, low`);
      return D({
        fnString: t,
        fnHash: o,
        options: { ...r, priority: n },
        args: s
      });
    },
    /**
     * Disables request coalescing for this execution.
     * Use for non-deterministic functions that should always execute separately.
     * 
     * Note: Coalescing is automatically disabled for functions containing
     * Date.now, Math.random, crypto.randomUUID, etc.
     * 
     * @example
     * await beeThreads.run(() => fetchLatestData()).noCoalesce().execute();
     */
    noCoalesce() {
      return D({
        fnString: t,
        fnHash: o,
        options: { ...r, skipCoalescing: !0 },
        args: s
      });
    },
    /**
     * Enables automatic Uint8Array to Buffer reconstruction.
     * Use when your function returns Buffer (e.g., Sharp, fs, crypto).
     * 
     * The Structured Clone Algorithm used by postMessage converts Buffer to Uint8Array.
     * This option recursively converts them back to Buffer.
     * 
     * @example
     * const buffer = await beeThreads
     *   .run((img) => require('sharp')(img).resize(100).toBuffer())
     *   .usingParams(imageBuffer)
     *   .reconstructBuffers()
     *   .execute();
     * console.log(Buffer.isBuffer(buffer)); // true
     */
    reconstructBuffers() {
      return D({
        fnString: t,
        fnHash: o,
        options: { ...r, reconstructBuffers: !0 },
        args: s
      });
    },
    /**
     * Executes the function in a worker thread.
     */
    execute() {
      return q(
        { toString: () => t },
        s,
        { ...r, poolType: "normal" },
        o
      );
    }
  };
}
function he(e = {}) {
  return function(o) {
    $e(o);
    const r = o.toString();
    Te(r, y.security.maxFunctionSize);
    const s = I(r);
    return D({
      fnString: r,
      fnHash: s,
      options: e,
      args: []
    });
  };
}
const V = 1e4, Q = 1e3;
function Y(e) {
  return ArrayBuffer.isView(e) ? e.constructor.name.charCodeAt(0) !== 68 : !1;
}
function Ee(e, t = {}) {
  return {
    setWorkers(r) {
      if (!Number.isInteger(r) || r < 1)
        throw new TypeError("setWorkers() requires a positive integer");
      return Ee(e, { ...t, workers: r });
    },
    map(r) {
      const s = r.toString(), i = I(s);
      return Je(
        s,
        i,
        e,
        t
      );
    },
    mapWithStats(r) {
      const s = r.toString(), i = I(s), n = Date.now();
      return xe(
        s,
        i,
        e,
        t,
        n
      );
    },
    filter(r) {
      const s = r.toString(), i = I(s);
      return rr(
        s,
        i,
        e,
        t
      );
    },
    reduce(r, s) {
      const i = r.toString(), n = I(i);
      return tr(
        i,
        n,
        e,
        s,
        t
      );
    }
  };
}
async function Je(e, t, o, r) {
  return (await xe(
    e,
    t,
    o,
    r,
    Date.now()
  )).data;
}
async function xe(e, t, o, r, s) {
  const i = o.length, n = Y(o);
  if (!r.force && i < V)
    return ve(
      e,
      t,
      o,
      r,
      s
    );
  const a = r.workers !== void 0 ? r.workers : y.poolSize, l = Math.ceil(i / Q), u = l < a ? l : a, g = u > 1 ? u : 1, m = r.chunkSize !== void 0 ? r.chunkSize : Math.ceil(i / g);
  return n ? Ye(
    e,
    t,
    o,
    g,
    m,
    r,
    s
  ) : er(
    e,
    t,
    o,
    g,
    m,
    r,
    s
  );
}
async function Ye(e, t, o, r, s, i, n) {
  const a = o.length, l = new SharedArrayBuffer(a * 8), u = new SharedArrayBuffer(a * 8), g = new SharedArrayBuffer(4), m = new Float64Array(l);
  for (let f = 0; f < a; f++)
    m[f] = o[f];
  const b = new Float64Array(u), p = new Int32Array(g);
  Atomics.store(p, 0, 0);
  const d = new Array(r);
  let k = 0;
  for (let f = 0; f < r; f++) {
    const z = f * s, S = z + s, v = S < a ? S : a;
    if (z >= a)
      break;
    const E = {
      type: "turbo_map",
      fn: e,
      startIndex: z,
      endIndex: v,
      workerId: f,
      totalWorkers: r,
      context: i.context,
      inputBuffer: l,
      outputBuffer: u,
      controlBuffer: g,
      chunk: void 0,
      initialValue: void 0
    };
    d[f] = nr(t, E), k++;
  }
  k === r ? await Promise.all(d) : await Promise.all(d.slice(0, k));
  const h = new Array(a);
  for (let f = 0; f < a; f++)
    h[f] = b[f];
  const C = Date.now() - n, c = C * k * 0.8, T = {
    totalItems: a,
    workersUsed: k,
    itemsPerWorker: Math.ceil(a / k),
    usedSharedMemory: !0,
    executionTime: C,
    speedupRatio: (c / C).toFixed(1) + "x"
  };
  return { data: h, stats: T };
}
async function er(e, t, o, r, s, i, n) {
  const a = o.length, l = new Array(
    r
  );
  let u = 0;
  for (let S = 0; S < r; S++) {
    const v = S * s;
    if (v >= a)
      break;
    const E = v + s;
    l[S] = { start: v, end: E < a ? E : a }, u++;
  }
  const g = new Array(u);
  for (let S = 0; S < u; S++)
    g[S] = j("normal", "high", t);
  const m = await Promise.all(g);
  let b = !1, p = null;
  const d = new Array(u);
  for (let S = 0; S < u; S++) {
    const { start: v, end: E } = l[S], w = o.slice(v, E), { entry: M, worker: F, temporary: O } = m[S];
    d[S] = Se(
      e,
      t,
      w,
      S,
      u,
      i.context,
      M,
      F,
      O,
      () => b
    ).catch((R) => {
      throw b || (b = !0, p = R), R;
    });
  }
  let k;
  try {
    k = await Promise.all(d);
  } catch (S) {
    throw p !== null ? p : S;
  }
  let h = 0;
  const C = new Array(u);
  for (let S = 0; S < u; S++)
    C[S] = h, h += k[S].length;
  const c = new Array(h);
  for (let S = 0; S < u; S++) {
    const v = k[S], E = v.length, w = C[S];
    for (let M = 0; M < E; M++)
      c[w + M] = v[M];
  }
  const T = Date.now() - n, f = T * u * 0.7, z = {
    totalItems: a,
    workersUsed: u,
    itemsPerWorker: Math.ceil(a / u),
    usedSharedMemory: !1,
    executionTime: T,
    speedupRatio: (f / T).toFixed(1) + "x"
  };
  return { data: c, stats: z };
}
async function rr(e, t, o, r) {
  const s = o.length;
  if (!r.force && s < V) {
    const c = new Function("return " + e)(), T = [];
    for (let f = 0; f < s; f++)
      c(o[f], f) && T.push(o[f]);
    return T;
  }
  const i = r.workers !== void 0 ? r.workers : y.poolSize, n = Math.ceil(s / Q), a = n < i ? n : i, l = Math.ceil(s / a), u = new Array(
    a
  );
  let g = 0;
  for (let c = 0; c < a; c++) {
    const T = c * l;
    if (T >= s)
      break;
    const f = T + l;
    u[c] = { start: T, end: f < s ? f : s }, g++;
  }
  const m = new Array(g);
  for (let c = 0; c < g; c++)
    m[c] = j("normal", "high", t);
  const b = await Promise.all(m), p = new Array(g);
  for (let c = 0; c < g; c++) {
    const { start: T, end: f } = u[c], z = o.slice(T, f), { entry: S, worker: v, temporary: E } = b[c];
    p[c] = Ce(
      e,
      t,
      z,
      c,
      g,
      r.context,
      S,
      v,
      E
    );
  }
  const d = await Promise.all(p);
  let k = 0;
  for (let c = 0; c < g; c++)
    k += d[c].length;
  const h = new Array(k);
  let C = 0;
  for (let c = 0; c < g; c++) {
    const T = d[c], f = T.length;
    for (let z = 0; z < f; z++)
      h[C++] = T[z];
  }
  return h;
}
async function tr(e, t, o, r, s) {
  const i = o.length;
  if (!s.force && i < V) {
    const c = new Function("return " + e)();
    let T = r;
    for (let f = 0; f < i; f++)
      T = c(T, o[f], f);
    return T;
  }
  const n = s.workers !== void 0 ? s.workers : y.poolSize, a = Math.ceil(i / Q), l = a < n ? a : n, u = Math.ceil(i / l), g = new Array(
    l
  );
  let m = 0;
  for (let c = 0; c < l; c++) {
    const T = c * u;
    if (T >= i)
      break;
    const f = T + u;
    g[c] = { start: T, end: f < i ? f : i }, m++;
  }
  const b = new Array(m);
  for (let c = 0; c < m; c++)
    b[c] = j("normal", "high", t);
  const p = await Promise.all(b), d = new Array(m);
  for (let c = 0; c < m; c++) {
    const { start: T, end: f } = g[c], z = o.slice(T, f), { entry: S, worker: v, temporary: E } = p[c];
    d[c] = Me(
      e,
      t,
      z,
      r,
      c,
      m,
      s.context,
      S,
      v,
      E
    );
  }
  const k = await Promise.all(d), h = new Function("return " + e)();
  let C = r;
  for (let c = 0; c < m; c++)
    C = h(C, k[c]);
  return C;
}
async function nr(e, t) {
  const { entry: o, worker: r, temporary: s } = await j(
    "normal",
    "high",
    e
  );
  return new Promise((i, n) => {
    const a = Date.now();
    let l = !1, u = null, g = null;
    const m = () => {
      l || (l = !0, u && r.removeEventListener("message", u), g && r.removeEventListener("error", g), H(
        o,
        r,
        s,
        "normal",
        Date.now() - a,
        !1,
        e
      ));
    };
    u = (b) => {
      const p = b.data, d = p.type;
      if (d === "turbo_complete")
        m(), i();
      else if (d === "turbo_error") {
        m();
        const k = p.error, h = new Error(
          k !== void 0 ? k.message : "Turbo worker error"
        );
        h.name = k !== void 0 ? k.name : "TurboError", n(h);
      }
    }, g = (b) => {
      m(), n(new Error(b.message || "Worker error"));
    }, r.addEventListener("message", u), r.addEventListener("error", g), r.postMessage(t);
  });
}
function Se(e, t, o, r, s, i, n, a, l, u) {
  return u() ? (H(n, a, l, "normal", 0, !1, t), Promise.reject(new Error("Turbo execution aborted"))) : new Promise((g, m) => {
    const b = Date.now();
    let p = !1, d = null, k = null;
    const h = () => {
      p || (p = !0, d && a.removeEventListener("message", d), k && a.removeEventListener("error", k), H(
        n,
        a,
        l,
        "normal",
        Date.now() - b,
        !1,
        t
      ));
    };
    d = (c) => {
      const T = c.data;
      if (u() && !p) {
        h(), m(new Error("Turbo execution aborted"));
        return;
      }
      if (T.type === "turbo_complete")
        h(), g(T.result);
      else if (T.type === "turbo_error") {
        h();
        const f = new Error(
          T.error !== void 0 ? T.error.message : "Turbo worker error"
        );
        f.name = T.error !== void 0 ? T.error.name : "TurboWorkerError", m(f);
      }
    }, k = (c) => {
      h(), m(new Error(c.message || "Worker error"));
    }, a.addEventListener("message", d), a.addEventListener("error", k);
    const C = {
      type: "turbo_map",
      fn: e,
      startIndex: 0,
      endIndex: 0,
      workerId: r,
      totalWorkers: s,
      context: i,
      inputBuffer: void 0,
      outputBuffer: void 0,
      controlBuffer: void 0,
      chunk: o,
      initialValue: void 0
    };
    a.postMessage(C);
  });
}
function Ce(e, t, o, r, s, i, n, a, l) {
  return new Promise((u, g) => {
    const m = Date.now();
    let b = !1, p = null, d = null;
    const k = () => {
      b || (b = !0, p && a.removeEventListener("message", p), d && a.removeEventListener("error", d), H(
        n,
        a,
        l,
        "normal",
        Date.now() - m,
        !1,
        t
      ));
    };
    p = (h) => {
      const C = h.data;
      C.type === "turbo_complete" ? (k(), u(C.result !== void 0 ? C.result : [])) : C.type === "turbo_error" && (k(), g(
        new Error(
          C.error !== void 0 ? C.error.message : "Turbo worker error"
        )
      ));
    }, d = (h) => {
      k(), g(new Error(h.message || "Worker error"));
    }, a.addEventListener("message", p), a.addEventListener("error", d), a.postMessage({
      type: "turbo_filter",
      fn: e,
      chunk: o,
      workerId: r,
      totalWorkers: s,
      context: i
    });
  });
}
function Me(e, t, o, r, s, i, n, a, l, u) {
  return new Promise((g, m) => {
    const b = Date.now();
    let p = !1, d = null, k = null;
    const h = () => {
      p || (p = !0, d && l.removeEventListener("message", d), k && l.removeEventListener("error", k), H(
        a,
        l,
        u,
        "normal",
        Date.now() - b,
        !1,
        t
      ));
    };
    d = (C) => {
      const c = C.data;
      if (c.type === "turbo_complete") {
        h();
        const T = c.result;
        g(
          T !== void 0 && T.length > 0 ? T[0] : r
        );
      } else
        c.type === "turbo_error" && (h(), m(
          new Error(
            c.error !== void 0 ? c.error.message : "Turbo worker error"
          )
        ));
    }, k = (C) => {
      h(), m(new Error(C.message || "Worker error"));
    }, l.addEventListener("message", d), l.addEventListener("error", k), l.postMessage({
      type: "turbo_reduce",
      fn: e,
      chunk: o,
      initialValue: r,
      workerId: s,
      totalWorkers: i,
      context: n
    });
  });
}
async function ve(e, t, o, r, s) {
  const { entry: i, worker: n, temporary: a } = await j(
    "normal",
    "normal",
    t
  ), l = o.length;
  return new Promise((u, g) => {
    const m = Date.now();
    let b = !1, p = null, d = null;
    const k = () => {
      b || (b = !0, p && n.removeEventListener("message", p), d && n.removeEventListener("error", d), H(
        i,
        n,
        a,
        "normal",
        Date.now() - m,
        !1,
        t
      ));
    };
    p = (C) => {
      const c = C.data;
      if (c.type === "turbo_complete") {
        k();
        const T = Date.now() - s, f = {
          totalItems: l,
          workersUsed: 1,
          itemsPerWorker: l,
          usedSharedMemory: !1,
          executionTime: T,
          speedupRatio: "1.0x"
        };
        u({ data: c.result, stats: f });
      } else
        c.type === "turbo_error" && (k(), g(
          new Error(
            c.error !== void 0 ? c.error.message : "Turbo worker error"
          )
        ));
    }, d = (C) => {
      k(), g(new Error(C.message || "Worker error"));
    }, n.addEventListener("message", p), n.addEventListener("error", d);
    const h = Y(o) ? Array.from(o) : o;
    n.postMessage({
      type: "turbo_map",
      fn: e,
      chunk: h,
      workerId: 0,
      totalWorkers: 1,
      context: r.context
    });
  });
}
function le(e, t) {
  if (!t || Object.keys(t).length === 0)
    return new Function("return " + e)();
  const o = Object.keys(t), r = o.map((i) => t[i]);
  return new Function(...o, "return (" + e + ")")(...r);
}
function Re(e, t = {}) {
  return {
    setWorkers(r) {
      if (!Number.isInteger(r) || r < 1)
        throw new TypeError("setWorkers() requires a positive integer");
      return Re(e, { ...t, workers: r });
    },
    map(r) {
      const s = r.toString(), i = I(s);
      return or(
        s,
        i,
        e,
        t
      );
    },
    mapWithStats(r) {
      const s = r.toString(), i = I(s), n = Date.now();
      return Ae(
        s,
        i,
        e,
        t,
        n
      );
    },
    filter(r) {
      const s = r.toString(), i = I(s);
      return sr(
        s,
        i,
        e,
        t
      );
    },
    reduce(r, s) {
      const i = r.toString(), n = I(i);
      return ir(
        i,
        n,
        e,
        s,
        t
      );
    }
  };
}
async function or(e, t, o, r) {
  return (await Ae(
    e,
    t,
    o,
    r,
    Date.now()
  )).data;
}
async function Ae(e, t, o, r, s) {
  const i = Y(o) ? Array.from(o) : o, n = i.length;
  if (!r.force && n < V)
    return ve(
      e,
      t,
      i,
      r,
      s
    );
  const a = r.workers !== void 0 ? r.workers : y.poolSize, l = Math.ceil(n / Q), u = l < a ? l : a, m = (u > 1 ? u : 1) + 1, b = r.chunkSize !== void 0 ? r.chunkSize : Math.ceil(n / m), p = new Array(
    m
  );
  let d = 0;
  for (let x = 0; x < m; x++) {
    const P = x * b;
    if (P >= n)
      break;
    const W = P + b;
    p[x] = { start: P, end: W < n ? W : n }, d++;
  }
  const k = d - 1, h = d - 1, C = new Array(h);
  for (let x = 0; x < h; x++)
    C[x] = j("normal", "high", t);
  const c = await Promise.all(C), T = new Array(h);
  for (let x = 0; x < h; x++) {
    const { start: P, end: W } = p[x], $ = i.slice(P, W), { entry: G, worker: ze, temporary: Le } = c[x];
    T[x] = Se(
      e,
      t,
      $,
      x,
      d,
      r.context,
      G,
      ze,
      Le,
      () => !1
    );
  }
  const f = p[k], z = i.slice(f.start, f.end), S = le(e, r.context), v = new Array(z.length);
  for (let x = 0; x < z.length; x++)
    v[x] = S(z[x], f.start + x);
  const E = await Promise.all(T);
  let w = 0;
  const M = new Array(d);
  for (let x = 0; x < h; x++)
    M[x] = w, w += E[x].length;
  M[k] = w, w += v.length;
  const F = new Array(w);
  for (let x = 0; x < h; x++) {
    const P = E[x], W = P.length, $ = M[x];
    for (let G = 0; G < W; G++)
      F[$ + G] = P[G];
  }
  const O = M[k];
  for (let x = 0; x < v.length; x++)
    F[O + x] = v[x];
  const R = Date.now() - s, A = R * d * 0.7, _ = {
    totalItems: n,
    workersUsed: d,
    itemsPerWorker: Math.ceil(n / d),
    usedSharedMemory: !1,
    executionTime: R,
    speedupRatio: (A / R).toFixed(1) + "x"
  };
  return { data: F, stats: _ };
}
async function sr(e, t, o, r) {
  const s = Y(o) ? Array.from(o) : o, i = s.length;
  if (!r.force && i < V) {
    const w = new Function("return " + e)(), M = [];
    for (let F = 0; F < i; F++)
      w(s[F], F) && M.push(s[F]);
    return M;
  }
  const n = r.workers !== void 0 ? r.workers : y.poolSize, a = Math.ceil(i / Q), u = (a < n ? a : n) + 1, g = Math.ceil(i / u), m = new Array(
    u
  );
  let b = 0;
  for (let w = 0; w < u; w++) {
    const M = w * g;
    if (M >= i)
      break;
    const F = M + g;
    m[w] = { start: M, end: F < i ? F : i }, b++;
  }
  const p = b - 1, d = b - 1, k = new Array(d);
  for (let w = 0; w < d; w++)
    k[w] = j("normal", "high", t);
  const h = await Promise.all(k), C = new Array(d);
  for (let w = 0; w < d; w++) {
    const { start: M, end: F } = m[w], O = s.slice(M, F), { entry: R, worker: A, temporary: _ } = h[w];
    C[w] = Ce(
      e,
      t,
      O,
      w,
      b,
      r.context,
      R,
      A,
      _
    );
  }
  const c = m[p], T = le(e, r.context), f = [];
  for (let w = c.start; w < c.end; w++)
    T(s[w], w) && f.push(s[w]);
  const z = await Promise.all(C);
  let S = f.length;
  for (let w = 0; w < d; w++)
    S += z[w].length;
  const v = new Array(S);
  let E = 0;
  for (let w = 0; w < d; w++) {
    const M = z[w], F = M.length;
    for (let O = 0; O < F; O++)
      v[E++] = M[O];
  }
  for (let w = 0; w < f.length; w++)
    v[E++] = f[w];
  return v;
}
async function ir(e, t, o, r, s) {
  const i = Y(o) ? Array.from(o) : o, n = i.length;
  if (!s.force && n < V) {
    const E = new Function("return " + e)();
    let w = r;
    for (let M = 0; M < n; M++)
      w = E(w, i[M], M);
    return w;
  }
  const a = s.workers !== void 0 ? s.workers : y.poolSize, l = Math.ceil(n / Q), g = (l < a ? l : a) + 1, m = Math.ceil(n / g), b = new Array(
    g
  );
  let p = 0;
  for (let E = 0; E < g; E++) {
    const w = E * m;
    if (w >= n)
      break;
    const M = w + m;
    b[E] = { start: w, end: M < n ? M : n }, p++;
  }
  const d = p - 1, k = p - 1, h = new Array(k);
  for (let E = 0; E < k; E++)
    h[E] = j("normal", "high", t);
  const C = await Promise.all(h), c = new Array(k);
  for (let E = 0; E < k; E++) {
    const { start: w, end: M } = b[E], F = i.slice(w, M), { entry: O, worker: R, temporary: A } = C[E];
    c[E] = Me(
      e,
      t,
      F,
      r,
      E,
      p,
      s.context,
      O,
      R,
      A
    );
  }
  const T = b[d], f = le(e, s.context);
  let z = r;
  for (let E = T.start; E < T.end; E++)
    z = f(z, i[E], E);
  const S = await Promise.all(c);
  let v = r;
  for (let E = 0; E < k; E++)
    v = f(v, S[E]);
  return v = f(v, z), v;
}
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
function ar(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e) && "beeClosures" in e;
}
function cr(e) {
  const t = {}, o = Object.keys(e);
  for (let r = 0, s = o.length; r < s; r++) {
    const i = o[r], n = e[i];
    typeof n == "function" ? t[i] = `__BEE_FN__:${n.toString()}` : t[i] = n;
  }
  return t;
}
function ur(e) {
  if (typeof e != "function")
    throw new TypeError(`bee() requires a function, got ${typeof e}`);
  const t = e.toString();
  Te(t, y.security.maxFunctionSize);
  const o = I(t);
  function r(s) {
    const i = function(...n) {
      let a = null, l = null;
      for (let g = 0, m = n.length; g < m; g++) {
        const b = n[g];
        if (ar(b)) {
          if (a = b, !l) {
            l = [];
            for (let p = 0; p < g; p++)
              l.push(n[p]);
          }
        } else
          l && l.push(b);
      }
      if (a) {
        y.security.blockPrototypePollution && oe(a.beeClosures);
        const g = cr(
          a.beeClosures
        ), m = l || n, b = s.length > 0 ? s.concat(m) : m;
        return q(
          t,
          b,
          { context: g },
          o
        );
      }
      return n.length === 0 ? q(
        t,
        s,
        {},
        o
      ) : r(
        s.length > 0 ? s.concat(n) : n
      );
    };
    return i.then = (n, a) => q(t, s, {}, o).then(n, a), i.catch = (n) => q(t, s, {}, o).catch(n), i.finally = (n) => q(t, s, {}, o).finally(n), Object.defineProperty(i, Symbol.toStringTag, {
      value: "CurriedFunction",
      writable: !1,
      enumerable: !1,
      configurable: !1
    }), i;
  }
  return r([]);
}
const fr = {
  /**
   * Creates an executor for running a function in a Web Worker thread.
   */
  run: he({ safe: !1 }),
  /**
   * Creates an executor with a timeout limit.
   */
  withTimeout(e) {
    return Ze(e), he({ safe: !1, timeout: e });
  },
  /**
   * Configures the worker pool settings.
   */
  configure(e = {}) {
    if (e.poolSize !== void 0 && (Xe(e.poolSize), y.poolSize = e.poolSize), e.minThreads !== void 0) {
      if (!Number.isInteger(e.minThreads) || e.minThreads < 0)
        throw new TypeError("minThreads must be a non-negative integer");
      if (e.minThreads > y.poolSize)
        throw new TypeError("minThreads cannot exceed poolSize");
      y.minThreads = e.minThreads;
    }
    if (e.maxQueueSize !== void 0) {
      if (typeof e.maxQueueSize != "number" || e.maxQueueSize < 0)
        throw new TypeError("maxQueueSize must be a non-negative number");
      y.maxQueueSize = e.maxQueueSize;
    }
    if (e.maxTemporaryWorkers !== void 0) {
      if (typeof e.maxTemporaryWorkers != "number" || e.maxTemporaryWorkers < 0)
        throw new TypeError(
          "maxTemporaryWorkers must be a non-negative number"
        );
      y.maxTemporaryWorkers = e.maxTemporaryWorkers;
    }
    if (e.workerIdleTimeout !== void 0) {
      if (typeof e.workerIdleTimeout != "number" || e.workerIdleTimeout < 0)
        throw new TypeError("workerIdleTimeout must be a non-negative number");
      y.workerIdleTimeout = e.workerIdleTimeout;
    }
    if (e.resourceLimits !== void 0 && (y.resourceLimits = e.resourceLimits), e.functionCacheSize !== void 0) {
      if (!Number.isInteger(e.functionCacheSize) || e.functionCacheSize < 1)
        throw new TypeError("functionCacheSize must be a positive integer");
      y.functionCacheSize = e.functionCacheSize;
    }
    if (e.lowMemoryMode !== void 0) {
      if (typeof e.lowMemoryMode != "boolean")
        throw new TypeError("lowMemoryMode must be a boolean");
      y.lowMemoryMode = e.lowMemoryMode;
    }
    if (e.debugMode !== void 0) {
      if (typeof e.debugMode != "boolean")
        throw new TypeError("debugMode must be a boolean");
      y.debugMode = e.debugMode;
    }
    if (e.logger !== void 0) {
      if (e.logger !== null && (typeof e.logger != "object" || typeof e.logger.log != "function"))
        throw new TypeError(
          "logger must be an object with log/warn/error/info/debug methods, or null to disable"
        );
      y.logger = e.logger;
    }
    if (e.coalescing !== void 0) {
      if (typeof e.coalescing != "boolean")
        throw new TypeError("coalescing must be a boolean");
      me(e.coalescing);
    }
    if (e.security !== void 0) {
      if (e.security.maxFunctionSize !== void 0) {
        if (typeof e.security.maxFunctionSize != "number" || e.security.maxFunctionSize < 1)
          throw new TypeError(
            "security.maxFunctionSize must be a positive number"
          );
        y.security.maxFunctionSize = e.security.maxFunctionSize;
      }
      if (e.security.blockPrototypePollution !== void 0) {
        if (typeof e.security.blockPrototypePollution != "boolean")
          throw new TypeError(
            "security.blockPrototypePollution must be a boolean"
          );
        y.security.blockPrototypePollution = e.security.blockPrototypePollution;
      }
    }
  },
  /**
   * Pre-creates workers to eliminate cold-start latency.
   */
  async warmup(e) {
    const t = e ?? y.minThreads;
    t <= 0 || await Ke("normal", t);
  },
  // ─────────────────────────────────────────────────────────────────────────
  // TURBO MODE - Parallel Array Processing with SharedArrayBuffer
  // ─────────────────────────────────────────────────────────────────────────
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
  turbo(e, t) {
    if (!Array.isArray(e) && !ArrayBuffer.isView(e))
      throw new TypeError(
        `turbo() requires an array or TypedArray, got ${typeof e}`
      );
    return t?.context && y.security.blockPrototypePollution && oe(t.context), Ee(e, t || {});
  },
  /**
   * Returns the minimum array size for turbo mode to be beneficial.
   * Arrays smaller than this threshold will automatically use single-worker mode.
   */
  get turboThreshold() {
    return V;
  },
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
  max(e, t) {
    if (!Array.isArray(e) && !ArrayBuffer.isView(e))
      throw new TypeError(
        `max() requires an array or TypedArray, got ${typeof e}`
      );
    return t?.context && y.security.blockPrototypePollution && oe(t.context), Re(e, t || {});
  },
  /**
   * Gracefully shuts down all worker pools.
   */
  async shutdown() {
    Pe();
    const e = U.normal;
    let t;
    for (; t = e.high.shift(); )
      t.reject(new K("Pool shutting down", "ERR_SHUTDOWN"));
    for (; t = e.normal.shift(); )
      t.reject(new K("Pool shutting down", "ERR_SHUTDOWN"));
    for (; t = e.low.shift(); )
      t.reject(new K("Pool shutting down", "ERR_SHUTDOWN"));
    const o = B.normal;
    B.normal = [], N.normal = { busy: 0, idle: 0 };
    const r = o.length, s = new Array(r);
    for (let i = 0; i < r; i++) {
      const n = o[i];
      n.terminationTimer && clearTimeout(n.terminationTimer), n.worker.terminate(), s[i] = Promise.resolve();
    }
    await Promise.all(s), L.activeTemporaryWorkers = 0;
  },
  /**
   * Symbol.dispose for automatic cleanup with `using` keyword (ES2024).
   */
  [Symbol.dispose]() {
    this.shutdown().catch(() => {
    });
  },
  /**
   * Symbol.asyncDispose for async cleanup with `await using` keyword.
   */
  [Symbol.asyncDispose]() {
    return this.shutdown();
  },
  /**
   * Returns current pool statistics and metrics.
   */
  getPoolStats() {
    const e = B.normal;
    return be({
      maxSize: y.poolSize,
      normal: {
        size: e.length,
        busy: N.normal.busy,
        idle: N.normal.idle,
        queued: pe(U.normal),
        queueByPriority: {
          high: U.normal.high.length,
          normal: U.normal.normal.length,
          low: U.normal.low.length
        },
        workers: e.map((t) => ({
          id: t.id,
          busy: t.busy,
          tasksExecuted: t.tasksExecuted,
          failedTasks: t.failedTasks,
          avgExecutionTime: t.tasksExecuted > 0 ? Math.round(t.totalExecutionTime / t.tasksExecuted) : 0,
          temporary: t.temporary,
          cachedFunctions: t.cachedFunctions?.size || 0
        }))
      },
      config: {
        poolSize: y.poolSize,
        minThreads: y.minThreads,
        maxQueueSize: y.maxQueueSize,
        maxTemporaryWorkers: y.maxTemporaryWorkers,
        workerIdleTimeout: y.workerIdleTimeout,
        resourceLimits: y.resourceLimits,
        functionCacheSize: y.functionCacheSize,
        lowMemoryMode: y.lowMemoryMode
      },
      metrics: {
        totalTasksExecuted: L.totalTasksExecuted,
        totalTasksFailed: L.totalTasksFailed,
        totalRetries: L.totalRetries,
        temporaryWorkersCreated: L.temporaryWorkersCreated,
        activeTemporaryWorkers: L.activeTemporaryWorkers,
        temporaryWorkerExecutionTime: L.temporaryWorkerExecutionTime,
        temporaryWorkerTasks: L.temporaryWorkerTasks,
        affinityHits: L.affinityHits,
        affinityMisses: L.affinityMisses,
        affinityHitRate: L.affinityHits + L.affinityMisses > 0 ? (L.affinityHits / (L.affinityHits + L.affinityMisses) * 100).toFixed(1) + "%" : "0%"
      },
      coalescing: ye()
    });
  },
  // ─────────────────────────────────────────────────────────────────────────
  // REQUEST COALESCING (Promise Deduplication)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Enables or disables request coalescing (promise deduplication).
   */
  setCoalescing(e) {
    me(e);
  },
  /**
   * Returns whether request coalescing is currently enabled.
   */
  isCoalescingEnabled() {
    return Ie();
  },
  /**
   * Returns request coalescing statistics.
   */
  getCoalescingStats() {
    return ye();
  },
  /**
   * Resets coalescing statistics counters.
   */
  resetCoalescingStats() {
    Oe();
  }
};
export {
  ee as AbortError,
  K as AsyncThreadError,
  Ne as QueueFullError,
  ae as TimeoutError,
  de as WorkerError,
  ur as bee,
  fr as beeThreads,
  fr as default,
  lr as noopLogger
};
