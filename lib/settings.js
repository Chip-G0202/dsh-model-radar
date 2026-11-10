// dsh-model-radar — runtime-tunable settings.
//
// The cordis config (`normalizeConfig` in index.js) is the default layer; this
// module owns the persisted overlay at `<dataDir>/settings.json` so the settings
// page can tune a live profile without reloading the plugin.
//
// Reads are fail-open: a missing or corrupted settings file silently falls back
// to the defaults and never throws. Writes use write-temp + rename so a crash
// cannot leave a half-written JSON file behind. The in-memory config object is
// mutated in place by the caller because the runner holds that reference.

import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

export const SETTINGS_VERSION = 1;

export const DEFAULT_RECOMMEND = Object.freeze({ quality: 0.45, speed: 0.2, cost: 0.2, stability: 0.15 });

/** UI ranges for every writable field; also the single source of clamping. */
export const SETTINGS_RANGES = Object.freeze({
  maxCombos: { min: 0, max: 512, step: 1 },
  maxParallelModels: { min: 1, max: 8, step: 1 },
  perTaskTimeoutMs: { min: 60_000, max: 14_400_000, step: 60_000 },
  perBatchTimeoutMs: { min: 300_000, max: 604_800_000, step: 60_000 },
  autoRetries: { min: 0, max: 2, step: 1 },
  judgeMaxAttempts: { min: 1, max: 4, step: 1 },
  speedRuns: { min: 0, max: 5, step: 1 },
  retentionBatches: { min: 1, max: 5_000, step: 1 },
  recommend: { min: 0, max: 1, step: 0.05 },
  usdToCny: { min: 1, max: 20, step: 0.1 },
});

/** Read-only fields: shown by GET /settings, ignored by POST /settings. */
export const LOCKED_SETTINGS_FIELDS = Object.freeze(["dataDir", "models", "benchPreset", "judgePreset"]);

const INT_FIELDS = Object.freeze([
  "maxCombos",
  "maxParallelModels",
  "perTaskTimeoutMs",
  "perBatchTimeoutMs",
  "autoRetries",
  "judgeMaxAttempts",
  "speedRuns",
  "retentionBatches",
]);

const RECOMMEND_KEYS = Object.freeze(["quality", "speed", "cost", "stability"]);

function asObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function round4(value) {
  return Number(Number(value).toFixed(4));
}

export function clampInt(value, fallback, min, max) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

/**
 * Clamp the four recommendation weights to 0..1 and normalize their sum to 1
 * (rounded to 4 decimals). An all-zero result falls back to the defaults.
 */
export function normalizeRecommendWeights(raw, fallback = DEFAULT_RECOMMEND) {
  const base = { ...DEFAULT_RECOMMEND, ...asObject(fallback) };
  const source = asObject(raw);
  const clamped = {};
  let sum = 0;
  for (const key of RECOMMEND_KEYS) {
    const baseline = Number.isFinite(Number(base[key]))
      ? clampNumber(base[key], DEFAULT_RECOMMEND[key], 0, 1)
      : DEFAULT_RECOMMEND[key];
    const value =
      source[key] === undefined || source[key] === null
        ? baseline
        : clampNumber(source[key], baseline, 0, 1);
    clamped[key] = value;
    sum += value;
  }
  if (!(sum > 0)) {
    for (const key of RECOMMEND_KEYS) clamped[key] = DEFAULT_RECOMMEND[key];
    sum = RECOMMEND_KEYS.reduce((total, key) => total + clamped[key], 0);
  }
  const normalized = {};
  for (const key of RECOMMEND_KEYS) normalized[key] = round4(clamped[key] / sum);
  return normalized;
}

/** Merge a (partial) judge object over the fallback; no catalog validation. */
export function normalizeJudge(raw, fallback = {}) {
  const base = asObject(fallback);
  const source = asObject(raw);
  const provider = source.provider === undefined ? base.provider : source.provider;
  const model = source.model === undefined ? base.model : source.model;
  const reasoningEffort =
    source.reasoningEffort === undefined
      ? (base.reasoningEffort ?? null)
      : source.reasoningEffort === null || source.reasoningEffort === ""
        ? null
        : String(source.reasoningEffort);
  return { provider, model, reasoningEffort };
}

export function settingsError(message) {
  const error = new Error(message);
  error.code = "settings";
  return error;
}

/**
 * Validate one judge `{provider, model, reasoningEffort}` change against the
 * live catalog. A missing effort falls back to the model default; an effort the
 * model does not support is rejected instead of silently downgraded.
 */
export function resolveJudgeSettings(catalog, patch, fallback = {}) {
  const base = asObject(fallback);
  const raw = asObject(patch);
  const provider = raw.provider === undefined ? base.provider : raw.provider;
  const model = raw.model === undefined ? base.model : raw.model;
  if (typeof provider !== "string" || provider === "") throw settingsError("judge provider is required");
  if (typeof model !== "string" || model === "") throw settingsError("judge model is required");
  const providerEntry = (catalog?.providers ?? []).find((entry) => entry?.id === provider);
  if (providerEntry === undefined) throw settingsError(`unknown judge provider: ${provider}`);
  const modelEntry = (providerEntry.models ?? []).find((entry) => entry?.id === model);
  if (modelEntry === undefined) throw settingsError(`unknown judge model: ${provider}/${model}`);
  const efforts = Array.isArray(modelEntry.efforts) ? modelEntry.efforts : [];
  const requested = raw.reasoningEffort === undefined ? (base.reasoningEffort ?? null) : raw.reasoningEffort;
  if (efforts.length === 0) {
    if (requested !== null && requested !== undefined && requested !== "" && requested !== "default") {
      throw settingsError(`model ${provider}/${model} does not support reasoning effort`);
    }
    return { provider, model, reasoningEffort: null };
  }
  if (requested === null || requested === undefined || requested === "") {
    return {
      provider,
      model,
      reasoningEffort: typeof modelEntry.defaultEffort === "string" ? modelEntry.defaultEffort : (efforts[0]?.id ?? null),
    };
  }
  if (typeof requested !== "string") throw settingsError("judge reasoningEffort must be a string");
  if (!efforts.some((entry) => entry?.id === requested)) {
    throw settingsError(`unsupported reasoning effort for ${provider}/${model}: ${requested}`);
  }
  return { provider, model, reasoningEffort: requested };
}

/**
 * Overlay persisted/patched values on a config object. Only the writable fields
 * are touched: `dataDir`, `models` and the preset ids stay authoritative in the
 * cordis config. Returns a new object; callers mutate the long-lived config with
 * Object.assign so the runner keeps seeing the same reference.
 */
export function mergeSettings(defaults, values) {
  const base = asObject(defaults);
  const raw = asObject(values);
  const merged = { ...base };
  for (const field of INT_FIELDS) {
    if (raw[field] === undefined || raw[field] === null) continue;
    const range = SETTINGS_RANGES[field];
    merged[field] = clampInt(raw[field], Number(base[field]) || range.min, range.min, range.max);
  }
  // Always normalize so a persisted file can never hold a non-normalized vector.
  merged.recommend = normalizeRecommendWeights(raw.recommend, base.recommend);
  const pricingBase = asObject(base.pricing);
  const pricingRaw = asObject(raw.pricing);
  const requestedUsd = pricingRaw.usdToCny !== undefined ? pricingRaw.usdToCny : raw.usdToCny;
  const usdFallback = Number.isFinite(Number(pricingBase.usdToCny)) ? Number(pricingBase.usdToCny) : 7.1;
  merged.pricing = {
    ...pricingBase,
    usdToCny:
      requestedUsd === undefined || requestedUsd === null
        ? usdFallback
        : clampNumber(requestedUsd, usdFallback, SETTINGS_RANGES.usdToCny.min, SETTINGS_RANGES.usdToCny.max),
  };
  merged.judge = normalizeJudge(raw.judge, base.judge);
  return merged;
}

/** The persisted snapshot: writable fields only, already clamped/normalized. */
export function writableSettings(config) {
  const source = asObject(config);
  const snapshot = { judge: normalizeJudge(source.judge) };
  for (const field of INT_FIELDS) {
    const range = SETTINGS_RANGES[field];
    snapshot[field] = clampInt(source[field], range.min, range.min, range.max);
  }
  snapshot.recommend = normalizeRecommendWeights(source.recommend);
  const usd = Number(asObject(source.pricing).usdToCny);
  snapshot.pricing = {
    usdToCny: Number.isFinite(usd)
      ? clampNumber(usd, 7.1, SETTINGS_RANGES.usdToCny.min, SETTINGS_RANGES.usdToCny.max)
      : 7.1,
  };
  return snapshot;
}

export function settingsPath(dataDir) {
  return path.join(dataDir, "settings.json");
}

/** Read the persisted overlay; returns null for missing/corrupted files. */
export function readSettingsSync(dataDir) {
  if (typeof dataDir !== "string" || dataDir === "") return null;
  try {
    const parsed = JSON.parse(readFileSync(settingsPath(dataDir), "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return {
      version: Number(parsed.version) || SETTINGS_VERSION,
      updatedAt: Number.isFinite(Number(parsed.updatedAt)) ? Number(parsed.updatedAt) : 0,
      values: asObject(parsed.values),
    };
  } catch {
    return null;
  }
}

/** Atomically persist `{ version, updatedAt, values }`; tmp file + rename. */
export async function writeSettings(dataDir, { values = {}, updatedAt = Date.now() } = {}) {
  if (typeof dataDir !== "string" || dataDir === "") {
    const error = new Error("settings data directory is unavailable");
    error.code = "settings";
    throw error;
  }
  await mkdir(dataDir, { recursive: true });
  const file = settingsPath(dataDir);
  const tmp = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  const payload = {
    version: SETTINGS_VERSION,
    updatedAt: Number(updatedAt) || Date.now(),
    values: asObject(values),
  };
  const handle = await open(tmp, "w");
  try {
    await handle.writeFile(JSON.stringify(payload, null, 2), "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
  await handle.close();
  try {
    await rename(tmp, file);
  } catch (error) {
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
  return payload;
}
