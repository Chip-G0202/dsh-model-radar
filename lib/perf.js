// dsh-model-radar — performance report.
//
// Folds DSH session events into per-request latency / speed samples, groups the
// samples by provider × model × reasoning effort and scores every combo on
// seven normalized dimensions (0–1000). Node built-ins only: no DSH package
// imports and no third-party dependencies.
//
// Contract used by index.js and the Client:
//   buildPerfReport(ctx, { range, config, excludeSessionIds, fresh }) -> PerfReport
//
// Exported pure helpers (used by test/perf.test.js):
//   foldSessionEvents(events, { now? }) -> { requests, tools, gaps, turns, steps }
//   quantile(values, p)                  -> number | null (linear interpolation)
//   scoreFromMetrics(metrics, weights)   -> { score, dimensions }
//   rangeWindow(range, now)              -> { from, to, prevFrom, prevTo, prevToExclusive }
//
// A request sample is one settled `assistant/message` that carries usage:
//   {
//     time, turn, step, sessionId?,
//     provider, model, reasoningEffort,
//     startTime, firstTokenTime, endTime,
//     ttftMs, decodeMs, outputTokens, tps,
//     inputTokens, cacheReadTokens, cacheWriteTokens, cacheHit,
//     reasoningChars, reasoningMs, reasoningCps,
//   }
// A tool sample is one matched `tool/call` → `tool/result` pair:
//   { time, turn, ms, ok, name, provider, model, reasoningEffort }

import { readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const BEIJING_OFFSET_MS = 8 * 3_600_000;
const DAY_MS = 86_400_000;
const SPEED_MIN_DECODE_MS = 300;
const ADEQUATE_SAMPLES = 20;
const CACHE_TTL_MS = 60_000;
const SESSION_FOLD_TTL_MS = 5 * 60_000;
const SESSION_READ_CONCURRENCY = 6;
const SESSION_FOLD_CACHE_LIMIT = 600;
const sessionFoldCache = new Map();
const FOLD_CACHE_VERSION = 1;
let diskFoldCache = null;
let diskFoldCacheDir = null;
let diskFoldCacheLoading = null;
let saveTimer = null;

async function loadDiskFoldCache(cacheDir) {
  if (diskFoldCacheDir !== cacheDir) {
    diskFoldCache = null;
    diskFoldCacheDir = cacheDir;
    diskFoldCacheLoading = null;
  }
  if (diskFoldCache !== null) return diskFoldCache;
  if (diskFoldCacheLoading !== null) return diskFoldCacheLoading;
  diskFoldCacheLoading = (async () => {
    const file = path.join(cacheDir, "perf-fold-cache.json");
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      if (parsed?.version === FOLD_CACHE_VERSION && parsed.sessions !== null && typeof parsed.sessions === "object") {
        for (const [sessionId, entry] of Object.entries(parsed.sessions)) {
          if (entry === null || typeof entry !== "object" || entry.session === undefined) continue;
          sessionFoldCache.set(sessionId, {
            at: asNumber(entry.at) ?? 0,
            mtimeMs: asNumber(entry.mtimeMs) ?? null,
            size: asNumber(entry.size) ?? null,
            session: entry.session,
          });
        }
      }
    } catch {
      // A first run or a corrupt cache simply starts cold.
    }
    diskFoldCache = { version: FOLD_CACHE_VERSION, sessions: {} };
    return diskFoldCache;
  })();
  return diskFoldCacheLoading;
}

function scheduleDiskFoldSave(cacheDir) {
  if (cacheDir === null || cacheDir === undefined) return;
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveDiskFoldCache(cacheDir);
  }, 1200);
  saveTimer.unref?.();
}

async function saveDiskFoldCache(cacheDir) {
  if (diskFoldCache === null || diskFoldCacheDir !== cacheDir) return;
  const sessions = {};
  for (const [sessionId, entry] of sessionFoldCache.entries()) {
    if (entry.mtimeMs === null || entry.size === null) continue;
    sessions[sessionId] = {
      at: entry.at,
      mtimeMs: entry.mtimeMs,
      size: entry.size,
      session: entry.session,
    };
  }
  const file = path.join(cacheDir, "perf-fold-cache.json");
  const temp = `${file}.tmp`;
  try {
    await writeFile(temp, JSON.stringify({ version: FOLD_CACHE_VERSION, sessions }), "utf8");
    await rename(temp, file);
  } catch {
    // The report still works without a persistent cache.
  }
}

async function scanSessionSignatures() {
  const root = path.join(os.homedir(), ".dsh", "sessions");
  const map = new Map();
  let workspaces;
  try {
    workspaces = await readdir(root);
  } catch {
    return map;
  }
  await Promise.all(
    workspaces.map(async (workspace) => {
      const workspaceDir = path.join(root, workspace);
      let ids;
      try {
        ids = await readdir(workspaceDir);
      } catch {
        return;
      }
      await Promise.all(
        ids.map(async (id) => {
          const file = path.join(workspaceDir, id, "session.v4.jsonl.zstd");
          const info = await stat(file).catch(() => null);
          if (info === null) return;
          const signature = { mtimeMs: info.mtimeMs, size: info.size };
          map.set(id, signature);
          map.set(`session-${id}`, signature);
        }),
      );
    }),
  );
  return map;
}
const CACHE_MAX_ENTRIES = 8;
const SESSION_BOARD_LIMIT = 50;

export const DEFAULT_PERF_WEIGHTS = Object.freeze({
  outputSpeed: 30,
  ttft: 15,
  reasoning: 10,
  toolGap: 10,
  toolMs: 10,
  toolSuccess: 15,
  cacheHit: 10,
});

// `zero` is the value that normalizes to 0, `full` the value that normalizes
// to 100. `full < zero` means lower is better (TTFT / tool timings).
const DIMENSION_DEFS = Object.freeze([
  { key: "outputSpeed", metric: "tps", unit: "tok/s", zero: 20, full: 200 },
  { key: "ttft", metric: "ttftMs", unit: "ms", zero: 12_000, full: 500 },
  { key: "reasoning", metric: "reasoningCps", unit: "cps", zero: 50, full: 600 },
  { key: "toolGap", metric: "toolGapMs", unit: "ms", zero: 30_000, full: 2_000 },
  { key: "toolMs", metric: "toolMs", unit: "ms", zero: 5_000, full: 10 },
  { key: "toolSuccess", metric: "toolSuccess", unit: "ratio", zero: 0.95, full: 1 },
  { key: "cacheHit", metric: "cacheHit", unit: "ratio", zero: 0.5, full: 1 },
]);

const RANGE_KEYS = new Set(["today", "week", "month", "all"]);

// `config.perfWeights` may use either the dimension key or the metric key.
const WEIGHT_ALIASES = Object.freeze({
  outputSpeed: ["outputSpeed", "tps"],
  ttft: ["ttft", "ttftMs"],
  reasoning: ["reasoning", "reasoningCps"],
  toolGap: ["toolGap", "toolGapMs"],
  toolMs: ["toolMs", "tool"],
  toolSuccess: ["toolSuccess"],
  cacheHit: ["cacheHit"],
});

// ── small helpers ────────────────────────────────────────────────────────

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asObject(value) {
  return isObject(value) ? value : null;
}

function asString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asKey(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function firstKey(...values) {
  for (const value of values) {
    const key = asKey(value);
    if (key !== null) return key;
  }
  return null;
}

function firstString(...values) {
  for (const value of values) {
    const text = asString(value);
    if (text !== null) return text;
  }
  return null;
}

function roundTo(value, digits) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function textLength(value) {
  return typeof value === "string" ? value.length : 0;
}

function hashText(text) {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function safeGet(ctx, name) {
  if (ctx === null || ctx === undefined || typeof ctx.get !== "function") return null;
  try {
    return ctx.get(name) ?? null;
  } catch {
    return null;
  }
}

// ── Beijing calendar windows ─────────────────────────────────────────────

function beijingParts(timeMs) {
  const date = new Date(timeMs + BEIJING_OFFSET_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

function beijingDayStart(timeMs) {
  const parts = beijingParts(timeMs);
  return Date.UTC(parts.year, parts.month, parts.day) - BEIJING_OFFSET_MS;
}

function beijingWeekStart(timeMs) {
  const dayStart = beijingDayStart(timeMs);
  const parts = beijingParts(dayStart);
  const offset = (parts.weekday + 6) % 7; // Monday = 0
  return dayStart - offset * DAY_MS;
}

function beijingMonthStart(timeMs) {
  const parts = beijingParts(timeMs);
  return Date.UTC(parts.year, parts.month, 1) - BEIJING_OFFSET_MS;
}

/**
 * One reporting window plus the immediately preceding equal-length window used
 * as the baseline. `all` has no lower bound and therefore no baseline.
 * @param {"today"|"week"|"month"|"all"} range
 * @param {number} [now]
 * @returns {{from: number|null, to: number, prevFrom: number|null, prevTo: number|null, prevToExclusive: number|null}}
 */
export function rangeWindow(range, now = Date.now()) {
  const normalized = RANGE_KEYS.has(range) ? range : "month";
  const at = asNumber(now) ?? Date.now();
  if (normalized === "all") {
    return { from: null, to: at, prevFrom: null, prevTo: null, prevToExclusive: null };
  }
  let from;
  if (normalized === "today") from = beijingDayStart(at);
  else if (normalized === "week") from = beijingWeekStart(at);
  else from = beijingMonthStart(at);
  const length = Math.max(0, at - from);
  return {
    from,
    to: at,
    prevFrom: from - length,
    prevTo: from,
    prevToExclusive: from,
  };
}

// ── percentiles and scoring ──────────────────────────────────────────────

/**
 * Linear-interpolated percentile (p in 0..1) over a numeric sample.
 * The input may be sorted or unsorted; an empty sample yields null.
 * @param {number[]} values
 * @param {number} p
 * @returns {number|null}
 */
export function quantile(values, p) {
  if (!Array.isArray(values)) return null;
  const clean = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (clean.length === 0) return null;
  clean.sort((left, right) => left - right);
  const q = clamp(typeof p === "number" && Number.isFinite(p) ? p : 0, 0, 1);
  const position = (clean.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (position - lower);
}

/** Merge user overrides into the seven default weights (same keys). */
export function normalizePerfWeights(weights) {
  const source = asObject(weights) ?? {};
  const normalized = {};
  for (const definition of DIMENSION_DEFS) {
    let raw;
    for (const alias of WEIGHT_ALIASES[definition.key]) {
      if (source[alias] !== undefined) {
        raw = source[alias];
        break;
      }
    }
    normalized[definition.key] =
      typeof raw === "number" && Number.isFinite(raw) && raw >= 0
        ? raw
        : DEFAULT_PERF_WEIGHTS[definition.key];
  }
  return normalized;
}

function normalizeDimension(definition, value) {
  const span = definition.full - definition.zero;
  if (span === 0) return value >= definition.full ? 100 : 0;
  return clamp(((value - definition.zero) / span) * 100, 0, 100);
}

function displayMetricValue(metric, value) {
  if (metric === "ttftMs" || metric === "toolGapMs" || metric === "toolMs") return Math.round(value);
  if (metric === "toolSuccess" || metric === "cacheHit") return roundTo(value, 3);
  return roundTo(value, 1);
}

/**
 * Normalize the seven metrics against their anchors and return the weighted
 * 0–1000 score. Dimensions with no sample (for example reasoning on a
 * non-reasoning model, or tools in a tool-free window) are omitted and their
 * weight is redistributed over the dimensions that do have data.
 * @param {object} metrics
 * @param {object} [weights]
 * @returns {{score: number, dimensions: Array<{key: string, weight: number, score: number, value: number, unit: string}>}}
 */
export function scoreFromMetrics(metrics, weights = DEFAULT_PERF_WEIGHTS) {
  const source = asObject(metrics) ?? {};
  const normalizedWeights = normalizePerfWeights(weights);
  const dimensions = [];
  let weighted = 0;
  let totalWeight = 0;
  for (const definition of DIMENSION_DEFS) {
    const value = asNumber(source[definition.metric]);
    const weight = normalizedWeights[definition.key];
    if (value === null || !(weight > 0)) continue;
    const normalized = normalizeDimension(definition, value);
    dimensions.push({
      key: definition.key,
      weight,
      score: Math.round(normalized),
      value: displayMetricValue(definition.metric, value),
      unit: definition.unit,
    });
    weighted += normalized * weight;
    totalWeight += weight;
  }
  const score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) : 0;
  return { score, dimensions };
}

// ── stream extraction ────────────────────────────────────────────────────

function chunkKindOf(type) {
  if (type === "text-delta") return "text";
  if (type === "reasoning-delta") return "reasoning";
  if (type === "tool-call-delta") return "tool";
  return null;
}

function packedKindOf(run) {
  const type = typeof run.type === "string" ? run.type : "";
  if (type.includes("tool")) return "tool";
  if (
    type.includes("reasoning") ||
    type.includes("thinking") ||
    run.channel === "reasoning" ||
    run.channel === "thinking"
  ) {
    return "reasoning";
  }
  return "text";
}

/** Reconstruct the time of packed-run fragment `index` (dsh-llm's time0 + dt). */
function packedFragmentTime(run, index) {
  let time = asNumber(run.time0) ?? 0;
  const deltas = Array.isArray(run.dt) ? run.dt : [];
  for (let cursor = 0; cursor < index && cursor < deltas.length; cursor += 1) {
    const delta = asNumber(deltas[cursor]);
    if (delta !== null) time += delta;
  }
  return time;
}

function emptyStreamMetrics() {
  return {
    firstTokenTime: null,
    firstReasoningTime: null,
    lastReasoningTime: null,
    reasoningChars: 0,
  };
}

function noteFirstToken(metrics, time) {
  if (time !== null && metrics.firstTokenTime === null) metrics.firstTokenTime = time;
}

function noteReasoning(metrics, chars, time) {
  if (chars <= 0 || time === null) return;
  noteFirstToken(metrics, time);
  if (metrics.firstReasoningTime === null) metrics.firstReasoningTime = time;
  metrics.lastReasoningTime = time;
  metrics.reasoningChars += chars;
}

/**
 * Best-effort first-token / reasoning extraction from a durable assistant
 * stream. Handles both `{type:"chunk", chunk, time}` records and the packed
 * `{type:"text-chunks"|"reasoning-chunks"|"tool-call-chunks", time0, dt, ...}`
 * form; unknown records are ignored.
 */
export function readStreamMetrics(stream) {
  const metrics = emptyStreamMetrics();
  if (!Array.isArray(stream)) return metrics;
  for (const record of stream) {
    if (!isObject(record)) continue;
    const wrapped = isObject(record.chunk) ? record.chunk : null;
    if (wrapped !== null) {
      const kind = chunkKindOf(wrapped.type);
      if (kind === null) continue;
      const time = asNumber(record.time);
      if (kind === "reasoning") {
        noteReasoning(metrics, textLength(wrapped.text), time);
      } else if (kind === "text") {
        if (textLength(wrapped.text) > 0) noteFirstToken(metrics, time);
      } else if (wrapped.name !== undefined || textLength(wrapped.argumentsDelta) > 0) {
        noteFirstToken(metrics, time);
      }
      continue;
    }
    const directKind = chunkKindOf(record.type);
    if (directKind !== null) {
      if (directKind === "reasoning") {
        noteReasoning(metrics, textLength(record.text), asNumber(record.time));
      } else if (directKind === "text") {
        if (textLength(record.text) > 0) noteFirstToken(metrics, asNumber(record.time));
      } else if (record.name !== undefined || textLength(record.argumentsDelta) > 0) {
        noteFirstToken(metrics, asNumber(record.time));
      }
      continue;
    }
    const kind = packedKindOf(record);
    if (kind === "reasoning") {
      const fragments = Array.isArray(record.texts) ? record.texts : [];
      for (let index = 0; index < fragments.length; index += 1) {
        const chars = textLength(fragments[index]);
        if (chars > 0) noteReasoning(metrics, chars, packedFragmentTime(record, index));
      }
      continue;
    }
    if (kind === "tool" && record.name !== undefined) {
      const args = Array.isArray(record.args) ? record.args : [];
      if (args.length === 0) {
        noteFirstToken(metrics, asNumber(record.time0));
        continue;
      }
    }
    const fragments = kind === "tool" ? (Array.isArray(record.args) ? record.args : []) : (Array.isArray(record.texts) ? record.texts : []);
    for (let index = 0; index < fragments.length; index += 1) {
      if (textLength(fragments[index]) > 0) {
        noteFirstToken(metrics, packedFragmentTime(record, index));
        break;
      }
    }
  }
  return metrics;
}


// ── event ordering / attribution ─────────────────────────────────────────

function stepKeyOf(data) {
  return `${String(data.turn)}:${String(data.step)}`;
}

/** Sort by `seq` when every event carries one; otherwise keep the given order. */
function orderedSessionEvents(events) {
  if (!Array.isArray(events)) return [];
  const list = events.filter((event) => isObject(event));
  let allSequenced = true;
  for (const event of list) {
    if (asNumber(event.seq) === null) {
      allSequenced = false;
      break;
    }
  }
  if (allSequenced && list.length > 1) list.sort((left, right) => left.seq - right.seq);
  return list;
}

function normalizeEffort(value) {
  const text = asString(value);
  if (text === null || text.toLowerCase() === "default") return null;
  return text;
}

function headerConfigOf(event) {
  const data = asObject(event.data);
  if (data === null) return null;
  const header = asObject(data.header);
  const nested = header !== null ? asObject(header.config) : null;
  return nested ?? asObject(data.config);
}

/**
 * Resolve one request's provider/model/effort.
 * Priority: `request/header.header.config`, then `assistant/message.source`,
 * then the last `request/context`. An absent effort is recorded as null
 * (the model's default tier) rather than guessed.
 */
function attributionOf(config, source, context) {
  const header = asObject(config) ?? {};
  const messageSource = asObject(source) ?? {};
  const requestContext = asObject(context) ?? {};
  const hasHeader = Object.keys(header).length > 0;
  const provider = firstString(header.provider, messageSource.provider, requestContext.provider);
  const model = firstString(header.model, messageSource.model, requestContext.model);
  let reasoningEffort;
  if (Object.prototype.hasOwnProperty.call(header, "reasoningEffort")) {
    reasoningEffort = normalizeEffort(header.reasoningEffort);
  } else if (hasHeader) {
    reasoningEffort = null;
  } else {
    reasoningEffort = normalizeEffort(messageSource.reasoningEffort);
  }
  return { provider, model, reasoningEffort };
}

// ── session folding ──────────────────────────────────────────────────────

/**
 * Fold one session's durable events into completed request samples, matched
 * tool samples and same-turn tool-call gaps.
 * @param {object[]} events ascending-seq session events
 * @param {{now?: number}} [options] `now` ignores later (future) events
 */
export function foldSessionEvents(events, options = {}) {
  const cutoff = asNumber(options?.now) ?? Number.POSITIVE_INFINITY;
  const list = orderedSessionEvents(events);
  const requests = [];
  const tools = [];
  const gaps = [];
  const calls = [];
  const openSteps = new Map();
  const pendingCalls = new Map();
  const turnsSeen = new Set();
  const completedSteps = new Set();
  let pendingHeader = null;
  let currentContext = null;
  let lastTime = 0;
  let stepCount = 0;
  let turnEndCount = 0;

  const latestOpenHeader = () => {
    for (const open of openSteps.values()) {
      if (open.header !== null) return open.header;
    }
    return pendingHeader;
  };

  const mergeStream = (open, stream) => {
    const metrics = readStreamMetrics(stream);
    if (open.firstTokenTime === null && metrics.firstTokenTime !== null) {
      open.firstTokenTime = metrics.firstTokenTime;
    }
    if (open.reasoning === null && metrics.reasoningChars > 0) open.reasoning = metrics;
    return metrics;
  };

  for (const event of list) {
    const time = asNumber(event.time) ?? lastTime;
    if (time > cutoff) continue;
    lastTime = time;
    const data = asObject(event.data) ?? {};

    switch (event.type) {
      case "request/header": {
        const config = headerConfigOf(event);
        if (config === null) break;
        pendingHeader = config;
        for (const open of openSteps.values()) open.header = config;
        break;
      }
      case "request/context": {
        currentContext = {
          provider: firstString(data.provider, currentContext?.provider),
          model: firstString(data.model, currentContext?.model),
        };
        break;
      }
      case "turn/start": {
        if (data.turn !== null && data.turn !== undefined) turnsSeen.add(String(data.turn));
        break;
      }
      case "step/start": {
        const turn = data.turn ?? null;
        const step = data.step ?? null;
        if (turn !== null) turnsSeen.add(String(turn));
        const open = {
          turn,
          step,
          startTime: time,
          firstTokenTime: null,
          reasoning: null,
          header: pendingHeader,
        };
        openSteps.set(stepKeyOf(data), open);
        stepCount += 1;
        break;
      }
      case "assistant/attempt": {
        const open = openSteps.get(stepKeyOf(data));
        if (open !== undefined) mergeStream(open, data.stream);
        break;
      }
      case "llm/retry-started": {
        // A retry starts a fresh attempt inside the same step; latency should be
        // measured from the attempt that actually produced the message.
        const open = openSteps.get(stepKeyOf(data));
        if (open !== undefined) {
          open.firstTokenTime = null;
          open.reasoning = null;
        }
        break;
      }
      case "assistant/message": {
        const usage = asObject(data.usage);
        if (usage === null) break; // only settled requests with usage count
        const key = stepKeyOf(data);
        if (completedSteps.has(key)) break; // retries keep one settled request per step
        completedSteps.add(key);
        let open = openSteps.get(key) ?? null;
        if (open === null) {
          open = {
            turn: data.turn ?? null,
            step: data.step ?? null,
            startTime: time,
            firstTokenTime: null,
            reasoning: null,
            header: pendingHeader,
          };
        }
        const streamMetrics = mergeStream(open, data.stream);
        openSteps.delete(key);

        const message = asObject(data.message) ?? {};
        const source = asObject(message.source) ?? {};
        const attribution = attributionOf(open.header ?? pendingHeader, source, currentContext);
        const firstTokenTime = open.firstTokenTime;
        const outputTokens = asNumber(usage.outputTokens);
        const inputTokens = asNumber(usage.inputTokens);
        const cacheReadTokens = asNumber(usage.cacheReadTokens);
        const cacheWriteTokens = asNumber(usage.cacheWriteTokens);
        const decodeMs =
          firstTokenTime !== null && time >= firstTokenTime ? Math.max(0, time - firstTokenTime) : null;
        const tps =
          decodeMs !== null &&
          decodeMs >= SPEED_MIN_DECODE_MS &&
          outputTokens !== null &&
          outputTokens > 0
            ? outputTokens / (decodeMs / 1000)
            : null;
        const reasoningChars = open.reasoning !== null ? open.reasoning.reasoningChars : streamMetrics.reasoningChars;
        const reasoningFirst =
          open.reasoning !== null ? open.reasoning.firstReasoningTime : streamMetrics.firstReasoningTime;
        const reasoningLast =
          open.reasoning !== null ? open.reasoning.lastReasoningTime : streamMetrics.lastReasoningTime;
        const reasoningMs =
          reasoningFirst !== null && reasoningLast !== null && reasoningLast > reasoningFirst
            ? reasoningLast - reasoningFirst
            : null;
        const reasoningCps =
          reasoningMs !== null && reasoningChars > 0
            ? reasoningChars / (reasoningMs / 1000)
            : null;
        const cacheDenominator =
          (inputTokens ?? 0) + (cacheReadTokens ?? 0);
        const cacheHit =
          cacheDenominator > 0 && (inputTokens !== null || cacheReadTokens !== null)
            ? (cacheReadTokens ?? 0) / cacheDenominator
            : null;

        requests.push({
          time,
          turn: open.turn,
          step: open.step,
          provider: attribution.provider,
          model: attribution.model,
          reasoningEffort: attribution.reasoningEffort,
          startTime: open.startTime,
          firstTokenTime,
          endTime: time,
          ttftMs:
            firstTokenTime !== null && firstTokenTime >= open.startTime
              ? firstTokenTime - open.startTime
              : null,
          decodeMs,
          outputTokens,
          tps,
          inputTokens,
          cacheReadTokens,
          cacheWriteTokens,
          cacheHit,
          reasoningChars,
          reasoningMs,
          reasoningCps,
        });
        break;
      }
      case "tool/call": {
        const callId = firstKey(data.callId, data.id, data.message?.callId);
        const call = {
          time,
          turn: data.turn ?? null,
          step: data.step ?? null,
          callId,
          name: firstString(data.name),
          attribution: attributionOf(latestOpenHeader(), null, currentContext),
        };
        calls.push(call);
        pendingCalls.set(callId ?? `__call_${calls.length}`, call);
        break;
      }
      case "tool/result": {
        const message = asObject(data.message) ?? {};
        const source = asObject(message.source) ?? {};
        const callId = firstKey(data.callId, source.callId, message.callId);
        const call = callId !== null ? pendingCalls.get(callId) : undefined;
        if (call === undefined) break;
        pendingCalls.delete(callId);
        tools.push({
          time: call.time,
          turn: call.turn,
          ms: Math.max(0, time - call.time),
          ok: message.isError !== true,
          name: call.name,
          provider: call.attribution.provider,
          model: call.attribution.model,
          reasoningEffort: call.attribution.reasoningEffort,
        });
        break;
      }
      case "step/end": {
        openSteps.delete(stepKeyOf(data));
        break;
      }
      case "turn/end": {
        turnEndCount += 1;
        openSteps.clear();
        pendingCalls.clear();
        break;
      }
      default:
        break;
    }
  }

  calls.sort((left, right) => left.time - right.time);
  const turnKeyOf = (call) => {
    if (call.turn !== null && call.turn !== undefined) return `turn:${String(call.turn)}`;
    if (call.step !== null && call.step !== undefined) return `step:${String(call.step)}`;
    return null;
  };
  let previousCall = null;
  for (const call of calls) {
    const previousTurnKey = previousCall === null ? null : turnKeyOf(previousCall);
    const turnKey = turnKeyOf(call);
    if (previousTurnKey !== null && turnKey !== null && previousTurnKey === turnKey) {
      const ms = call.time - previousCall.time;
      if (ms > 0) {
        gaps.push({
          time: call.time,
          turn: call.turn,
          ms,
          provider: call.attribution.provider,
          model: call.attribution.model,
          reasoningEffort: call.attribution.reasoningEffort,
        });
      }
    }
    previousCall = call;
  }

  requests.sort((left, right) => left.time - right.time);
  return {
    requests,
    tools,
    gaps,
    turns: turnEndCount > 0 ? turnEndCount : turnsSeen.size,
    steps: stepCount,
  };
}

// ── aggregation helpers ──────────────────────────────────────────────────

function comboKeyOf(entry) {
  return `${entry.provider ?? ""}\u0000${entry.model ?? ""}\u0000${entry.reasoningEffort ?? ""}`;
}

function bucketOf(groups, entry) {
  const key = comboKeyOf(entry);
  let bucket = groups.get(key);
  if (bucket === undefined) {
    bucket = {
      provider: entry.provider ?? null,
      model: entry.model ?? null,
      reasoningEffort: entry.reasoningEffort ?? null,
      requests: [],
      tools: [],
      gaps: [],
    };
    groups.set(key, bucket);
  }
  return bucket;
}

function metricsOfBucket(bucket) {
  const requests = bucket.requests;
  const tps = quantile(requests.map((request) => request.tps), 0.5);
  const ttftMs = quantile(requests.map((request) => request.ttftMs), 0.5);
  const reasoningCps = quantile(requests.map((request) => request.reasoningCps), 0.5);
  const toolGapMs = quantile(bucket.gaps.map((gap) => gap.ms), 0.5);
  const toolMs = quantile(bucket.tools.map((tool) => tool.ms), 0.5);
  const calls = bucket.tools.length;
  const toolSuccess = calls > 0 ? bucket.tools.filter((tool) => tool.ok === true).length / calls : null;
  let inputTotal = 0;
  let cacheReadTotal = 0;
  let cacheSeen = false;
  for (const request of requests) {
    if (request.inputTokens !== null) {
      inputTotal += request.inputTokens;
      cacheSeen = true;
    }
    if (request.cacheReadTokens !== null) {
      cacheReadTotal += request.cacheReadTokens;
      cacheSeen = true;
    }
  }
  const cacheDenominator = inputTotal + cacheReadTotal;
  const cacheHit = cacheSeen && cacheDenominator > 0 ? cacheReadTotal / cacheDenominator : null;
  return { ttftMs, tps, reasoningCps, toolGapMs, toolMs, toolSuccess, cacheHit };
}

function roundedMetrics(metrics) {
  return {
    ttftMs: metrics.ttftMs === null ? null : Math.round(metrics.ttftMs),
    tps: roundTo(metrics.tps, 1),
    reasoningCps: roundTo(metrics.reasoningCps, 1),
    toolGapMs: metrics.toolGapMs === null ? null : Math.round(metrics.toolGapMs),
    toolMs: metrics.toolMs === null ? null : Math.round(metrics.toolMs),
    toolSuccess: roundTo(metrics.toolSuccess, 3),
    cacheHit: roundTo(metrics.cacheHit, 3),
  };
}

function baselineFor(range, previousBucket, weights, currentScore) {
  if (range === "all" || previousBucket === undefined || previousBucket.requests.length === 0) {
    return { status: "insufficient", score: null, deltaPct: null };
  }
  const previousScore = scoreFromMetrics(metricsOfBucket(previousBucket), weights).score;
  if (previousBucket.requests.length < ADEQUATE_SAMPLES) {
    return { status: "insufficient", score: previousScore, deltaPct: null };
  }
  let deltaPct = null;
  if (previousScore > 0) {
    deltaPct = roundTo(((currentScore - previousScore) / previousScore) * 100, 1);
  } else if (currentScore === 0) {
    deltaPct = 0;
  }
  return { status: "ok", score: previousScore, deltaPct };
}

function statsView(values, digits) {
  const clean = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (clean.length === 0) {
    return { avg: null, p50: null, p95: null, p99: null, samples: 0 };
  }
  const sum = clean.reduce((total, value) => total + value, 0);
  return {
    avg: roundTo(sum / clean.length, digits),
    p50: roundTo(quantile(clean, 0.5), digits),
    p95: roundTo(quantile(clean, 0.95), digits),
    p99: roundTo(quantile(clean, 0.99), digits),
    samples: clean.length,
  };
}

function meanOf(values) {
  const clean = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (clean.length === 0) return null;
  return clean.reduce((total, value) => total + value, 0) / clean.length;
}

function dominantCombo(requests) {
  const counts = new Map();
  for (const request of requests) {
    if (request.model === null) continue;
    const key = comboKeyOf(request);
    const row = counts.get(key);
    if (row === undefined) {
      counts.set(key, { count: 1, provider: request.provider, model: request.model });
    } else {
      row.count += 1;
    }
  }
  let best = null;
  for (const row of counts.values()) {
    if (best === null || row.count > best.count) best = row;
  }
  return best;
}

function sessionBoardEntry(session, requests) {
  const decodeRequests = requests.filter(
    (request) =>
      request.tps !== null &&
      request.outputTokens !== null &&
      request.outputTokens > 0 &&
      request.decodeMs !== null &&
      request.decodeMs > 0,
  );
  if (decodeRequests.length === 0) return null;
  const decodeTokens = decodeRequests.reduce((total, request) => total + request.outputTokens, 0);
  const decodeMs = decodeRequests.reduce((total, request) => total + request.decodeMs, 0);
  if (!(decodeMs > 0) || decodeTokens <= 0) return null;
  const outputTokens = decodeTokens;
  const ttftMs = meanOf(requests.map((request) => request.ttftMs));
  const combo = dominantCombo(requests);
  const turnNumbers = new Set(
    requests
      .map((request) => request.turn)
      .filter((turn) => turn !== null && turn !== undefined)
      .map((turn) => String(turn)),
  );
  return {
    sessionId: session.sessionId,
    title: session.title,
    provider: combo?.provider ?? null,
    model: combo?.model ?? null,
    outputTokens,
    decodeMs,
    tps: roundTo(decodeTokens / (decodeMs / 1000), 1),
    ttftMs: ttftMs === null ? null : Math.round(ttftMs),
    turns: turnNumbers.size > 0 ? turnNumbers.size : session.turns,
  };
}

// ── session enumeration / reading ────────────────────────────────────────

function sessionRecordId(record) {
  if (typeof record === "string") return asString(record);
  const header = asObject(record?.header);
  return firstString(header?.id, record?.id, record?.sessionId);
}

function liveSessionEvents(session) {
  if (session === null || session === undefined) return null;
  try {
    if (typeof session.ownEvents === "function") {
      const events = session.ownEvents();
      if (Array.isArray(events)) return events;
    } else if (Array.isArray(session.ownEvents)) {
      return session.ownEvents;
    }
  } catch {
    // fall through to eventAt / persisted snapshot
  }
  try {
    if (typeof session.eventAt === "function") {
      const seq = asNumber(session.seq);
      if (seq !== null && seq >= 0) {
        const events = [];
        for (let index = 0; index < seq; index += 1) {
          try {
            const event = session.eventAt(index);
            if (event !== undefined && event !== null) events.push(event);
          } catch {
            // skip one unreadable event
          }
        }
        return events;
      }
    }
  } catch {
    // fall through to persisted snapshot
  }
  try {
    if (Array.isArray(session.events)) return session.events;
  } catch {
    // ignore
  }
  return null;
}

async function readSessionEvents(ctx, query, sessionId) {
  const sessions = safeGet(ctx, "sessions");
  if (sessions !== null && typeof sessions.get === "function") {
    try {
      const session = sessions.get(sessionId);
      const events = liveSessionEvents(session);
      if (Array.isArray(events) && events.length > 0) return events;
    } catch {
      // live read failed; try the persisted snapshot below
    }
  }
  if (query !== null && typeof query.readSession === "function") {
    const snapshot = await query.readSession(sessionId);
    if (isObject(snapshot) && Array.isArray(snapshot.events)) return snapshot.events;
  }
  return null;
}

async function readSessionTitle(query, record, sessionId) {
  const header = asObject(record?.header);
  const direct = firstString(header?.title, record?.title, record?.name);
  if (direct !== null) return direct;
  if (query !== null && typeof query.readTitle === "function") {
    try {
      const snapshot = await query.readTitle(sessionId);
      if (isObject(snapshot)) return firstString(snapshot.title);
    } catch {
      // titles are best effort
    }
  }
  return null;
}

function toIdSet(value) {
  const set = new Set();
  if (value instanceof Set) {
    for (const id of value) {
      const text = asString(id);
      if (text !== null) set.add(text);
    }
    return set;
  }
  if (Array.isArray(value)) {
    for (const id of value) {
      const text = asString(id);
      if (text !== null) set.add(text);
    }
  }
  return set;
}

async function loadSessions(ctx, excludeIds, { window, now, cacheDir } = {}) {
  const empty = { sessions: [], stats: { sessions: 0, readMs: 0, foldMs: 0, cached: 0 } };
  const query = safeGet(ctx, "sessionQuery");
  if (query === null || typeof query.listSessions !== "function") return empty;
  let records;
  try {
    records = await query.listSessions();
  } catch {
    return empty;
  }
  if (!Array.isArray(records)) return empty;
  const createdCutoff = window?.from === null || window?.from === undefined ? null : window.from - 3 * 86_400_000;
  const activityCutoff = window?.from === null || window?.from === undefined ? null : window.from - 60_000;
  const signatures = await scanSessionSignatures();
  const candidates = [];
  for (const record of records) {
    const sessionId = sessionRecordId(record);
    if (sessionId === null || excludeIds.has(sessionId)) continue;
    const createdAt = asNumber(record?.header?.createdAt) ?? asNumber(record?.createdAt);
    if (createdCutoff !== null && createdAt !== null && createdAt < createdCutoff) continue;
    const signature = signatures.get(sessionId) ?? null;
    if (activityCutoff !== null && record?.live !== true && signature !== null && signature.mtimeMs < activityCutoff) continue;
    candidates.push({ record, sessionId });
  }
  if (cacheDir !== null && cacheDir !== undefined) await loadDiskFoldCache(cacheDir);
  const sessions = [];
  const stats = { sessions: candidates.length, readMs: 0, foldMs: 0, cached: 0 };
  let cursor = 0;
  const at = now ?? Date.now();
  const worker = async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= candidates.length) return;
      const { record, sessionId } = candidates[index];
      const live = record?.live === true;
      if (live) sessionFoldCache.delete(sessionId);
      const signature = signatures.get(sessionId) ?? null;
      const cached = live ? undefined : sessionFoldCache.get(sessionId);
      const sameFile =
        cached !== undefined &&
        signature !== null &&
        cached.mtimeMs === signature.mtimeMs &&
        cached.size === signature.size;
      const freshMemory =
        cached !== undefined &&
        signature === null &&
        at - cached.at < SESSION_FOLD_TTL_MS;
      if (!live && cached !== undefined && (sameFile || freshMemory)) {
        sessions.push(cached.session);
        stats.cached += 1;
        continue;
      }
      let events;
      const readStarted = Date.now();
      try {
        events = await readSessionEvents(ctx, query, sessionId);
      } catch {
        continue;
      }
      stats.readMs += Date.now() - readStarted;
      if (!Array.isArray(events) || events.length === 0) continue;
      let fold;
      const foldStarted = Date.now();
      try {
        fold = foldSessionEvents(events, { now: at });
      } catch {
        continue;
      }
      stats.foldMs += Date.now() - foldStarted;
      const session = {
        sessionId,
        title: await readSessionTitle(query, record, sessionId),
        fold,
      };
      if (!live) {
        sessionFoldCache.set(sessionId, {
          at,
          mtimeMs: signature?.mtimeMs ?? null,
          size: signature?.size ?? null,
          session,
        });
        if (sessionFoldCache.size > SESSION_FOLD_CACHE_LIMIT) {
          const oldest = sessionFoldCache.keys().next().value;
          if (oldest !== undefined) sessionFoldCache.delete(oldest);
        }
      }
      sessions.push(session);
    }
  };
  const width = Math.min(SESSION_READ_CONCURRENCY, Math.max(1, candidates.length));
  await Promise.all(Array.from({ length: width }, () => worker()));
  return { sessions, stats };
}

// ── report assembly ──────────────────────────────────────────────────────

function emptyReport(range, window, now) {
  return {
    range,
    from: window.from,
    to: window.to,
    generatedAt: now,
    samples: 0,
    requests: 0,
    models: [],
    ttft: { avg: null, p50: null, p95: null, p99: null, samples: 0 },
    tps: { avg: null, p50: null, p95: null, p99: null, samples: 0 },
    tools: { avgMs: null, p50: null, p95: null, calls: 0, successRate: null },
    reasoning: { avgCharsPerSec: null, samples: 0 },
    sessions: [],
  };
}

function assembleReport({ range, window, weights, now, sessions }) {
  const report = emptyReport(range, window, now);
  const currentRequests = [];
  const currentTools = [];
  const currentGroups = new Map();
  const previousGroups = new Map();
  const board = [];
  const inCurrent = (time) =>
    window.from === null || (time >= window.from && time <= window.to);
  const inPrevious = (time) =>
    window.prevFrom !== null && time >= window.prevFrom && time < window.prevToExclusive;

  for (const session of sessions) {
    const folded = session.fold;
    if (folded === undefined || folded === null) continue;
    const sessionRequests = folded.requests.filter((request) => inCurrent(request.time));
    if (sessionRequests.length === 0) continue;
    const sessionTools = folded.tools.filter((tool) => inCurrent(tool.time));
    const sessionGaps = folded.gaps.filter((gap) => inCurrent(gap.time));

    for (const request of sessionRequests) {
      const enriched = { ...request, sessionId: session.sessionId };
      currentRequests.push(enriched);
      if (enriched.model !== null) bucketOf(currentGroups, enriched).requests.push(enriched);
    }
    for (const tool of sessionTools) {
      currentTools.push(tool);
      if (tool.model !== null) bucketOf(currentGroups, tool).tools.push(tool);
    }
    for (const gap of sessionGaps) {
      if (gap.model !== null) bucketOf(currentGroups, gap).gaps.push(gap);
    }

    const previousSessionRequests = folded.requests.filter((request) => inPrevious(request.time));
    if (previousSessionRequests.length > 0) {
      const previousSessionTools = folded.tools.filter((tool) => inPrevious(tool.time));
      const previousSessionGaps = folded.gaps.filter((gap) => inPrevious(gap.time));
      for (const request of previousSessionRequests) {
        if (request.model !== null) bucketOf(previousGroups, request).requests.push(request);
      }
      for (const tool of previousSessionTools) {
        if (tool.model !== null) bucketOf(previousGroups, tool).tools.push(tool);
      }
      for (const gap of previousSessionGaps) {
        if (gap.model !== null) bucketOf(previousGroups, gap).gaps.push(gap);
      }
    }

    const entry = sessionBoardEntry(
      {
        sessionId: session.sessionId,
        title: session.title,
        turns: folded.turns,
      },
      sessionRequests,
    );
    if (entry !== null) board.push(entry);
  }

  report.samples = currentRequests.length;
  report.requests = currentRequests.length;

  const models = [];
  for (const bucket of currentGroups.values()) {
    if (bucket.requests.length === 0 || bucket.model === null) continue;
    const metrics = metricsOfBucket(bucket);
    const { score, dimensions } = scoreFromMetrics(metrics, weights);
    const samples = bucket.requests.length;
    models.push({
      provider: bucket.provider ?? "",
      model: bucket.model,
      reasoningEffort: bucket.reasoningEffort,
      score,
      samples,
      adequate: samples >= ADEQUATE_SAMPLES,
      dimensions,
      baseline: baselineFor(range, previousGroups.get(comboKeyOf(bucket)), weights, score),
      metrics: roundedMetrics(metrics),
    });
  }
  models.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.samples !== left.samples) return right.samples - left.samples;
    const providerOrder = left.provider.localeCompare(right.provider);
    if (providerOrder !== 0) return providerOrder;
    const modelOrder = left.model.localeCompare(right.model);
    if (modelOrder !== 0) return modelOrder;
    return String(left.reasoningEffort ?? "").localeCompare(String(right.reasoningEffort ?? ""));
  });
  report.models = models;

  report.ttft = statsView(
    currentRequests.map((request) => request.ttftMs),
    0,
  );
  report.tps = statsView(
    currentRequests.map((request) => request.tps),
    1,
  );

  const toolValues = currentTools.map((tool) => tool.ms);
  const toolCalls = currentTools.length;
  report.tools = {
    avgMs: toolCalls > 0 ? roundTo(meanOf(toolValues), 0) : null,
    p50: toolCalls > 0 ? Math.round(quantile(toolValues, 0.5)) : null,
    p95: toolCalls > 0 ? Math.round(quantile(toolValues, 0.95)) : null,
    calls: toolCalls,
    successRate:
      toolCalls > 0
        ? roundTo(currentTools.filter((tool) => tool.ok === true).length / toolCalls, 3)
        : null,
  };

  const reasoningCps = currentRequests
    .map((request) => request.reasoningCps)
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  report.reasoning = {
    avgCharsPerSec: reasoningCps.length > 0 ? roundTo(meanOf(reasoningCps), 1) : null,
    samples: reasoningCps.length,
  };

  board.sort((left, right) => {
    if (right.tps !== left.tps) return right.tps - left.tps;
    return right.outputTokens - left.outputTokens;
  });
  report.sessions = board.slice(0, SESSION_BOARD_LIMIT);

  return report;
}

// ── caching ──────────────────────────────────────────────────────────────

const reportCache = new Map();

function cacheKeyOf(range, excludeIds, weights) {
  const ids = [...excludeIds].sort().join("\n");
  return `${range}|${hashText(ids)}|${hashText(JSON.stringify(weights))}`;
}

function pruneCache(now) {
  for (const [key, entry] of reportCache) {
    if (!(now - entry.at < CACHE_TTL_MS)) reportCache.delete(key);
  }
  while (reportCache.size > CACHE_MAX_ENTRIES) {
    const oldest = reportCache.keys().next().value;
    if (oldest === undefined) break;
    reportCache.delete(oldest);
  }
}

function normalizeRange(range) {
  return RANGE_KEYS.has(range) ? range : "month";
}

/**
 * Build the cross-session performance report.
 * @param {object} ctx Cordis host context (needs `sessionQuery`, optionally `sessions`)
 * @param {{range?: string, config?: object, excludeSessionIds?: string[]|Set<string>, fresh?: boolean}} [options]
 * @returns {Promise<object>} PerfReport
 */
export async function buildPerfReport(
  ctx,
  { range = "month", config, excludeSessionIds, fresh, cacheDir } = {},
) {
  const normalizedRange = normalizeRange(range);
  const normalizedConfig = asObject(config) ?? {};
  const weights = normalizePerfWeights(normalizedConfig.perfWeights);
  const excludeIds = toIdSet(excludeSessionIds);
  const now = Date.now();
  const window = rangeWindow(normalizedRange, now);
  const key = cacheKeyOf(normalizedRange, excludeIds, weights);

  if (fresh !== true) {
    const cached = reportCache.get(key);
    if (cached !== undefined && now - cached.at < CACHE_TTL_MS) return cached.report;
  }

  let sessions = [];
  let loadStats = null;
  try {
    const loaded = await loadSessions(ctx, excludeIds, { window, now, cacheDir });
    sessions = loaded.sessions;
    loadStats = loaded.stats;
  } catch {
    sessions = [];
  }

  let report;
  try {
    report = assembleReport({ range: normalizedRange, window, weights, now, sessions });
  } catch {
    report = emptyReport(normalizedRange, window, now);
  }

  if (loadStats !== null) {
    report.scope = {
      sessionsScanned: loadStats.sessions,
      sessionsWithData: sessions.length,
      requests: report.samples,
      cachedSessions: loadStats.cached,
    };
  }
  if (cacheDir !== null && cacheDir !== undefined) scheduleDiskFoldSave(cacheDir);
  reportCache.set(key, { at: now, report });
  pruneCache(now);
  return report;
}