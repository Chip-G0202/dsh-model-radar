import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_RECOMMEND,
  LOCKED_SETTINGS_FIELDS,
  SETTINGS_RANGES,
  SETTINGS_VERSION,
  clampInt,
  clampNumber,
  mergeSettings,
  normalizeJudge,
  normalizeRecommendWeights,
  readSettingsSync,
  resolveJudgeSettings,
  settingsPath,
  writableSettings,
  writeSettings,
} from "../lib/settings.js";

function baseConfig() {
  return {
    judge: { provider: "ali", model: "judge-a", reasoningEffort: "high" },
    models: [],
    maxCombos: 0,
    maxParallelModels: 3,
    perTaskTimeoutMs: 10_800_000,
    perBatchTimeoutMs: 172_800_000,
    autoRetries: 1,
    judgeMaxAttempts: 2,
    speedRuns: 3,
    retentionBatches: 200,
    recommend: { ...DEFAULT_RECOMMEND },
    dataDir: "/tmp/mr-settings",
    benchPreset: "model-radar-bench",
    judgePreset: "model-radar-judge",
    pricing: { usdToCny: 7.1, fallbackModel: "deepseek-v4.1-flash", models: {} },
  };
}

function fakeCatalog() {
  return {
    providers: [
      {
        id: "ali",
        name: "Ali",
        models: [
          {
            id: "judge-a",
            efforts: [
              { id: "low", name: "Low" },
              { id: "high", name: "High" },
            ],
            defaultEffort: "low",
          },
          { id: "plain", efforts: [], defaultEffort: null },
        ],
      },
    ],
  };
}

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mr-settings-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("settings ranges cover every writable field with the documented bounds", () => {
  for (const field of [
    "maxCombos",
    "maxParallelModels",
    "perTaskTimeoutMs",
    "perBatchTimeoutMs",
    "autoRetries",
    "judgeMaxAttempts",
    "speedRuns",
    "retentionBatches",
    "recommend",
    "usdToCny",
  ]) {
    const range = SETTINGS_RANGES[field];
    assert.ok(range !== undefined, `missing range: ${field}`);
    assert.equal(typeof range.min, "number");
    assert.equal(typeof range.max, "number");
    assert.equal(typeof range.step, "number");
  }
  assert.deepEqual(SETTINGS_RANGES.maxCombos, { min: 0, max: 512, step: 1 });
  assert.deepEqual(SETTINGS_RANGES.maxParallelModels, { min: 1, max: 8, step: 1 });
  assert.deepEqual(SETTINGS_RANGES.perTaskTimeoutMs, { min: 60_000, max: 14_400_000, step: 60_000 });
  assert.deepEqual(SETTINGS_RANGES.perBatchTimeoutMs, { min: 300_000, max: 604_800_000, step: 60_000 });
  assert.deepEqual(SETTINGS_RANGES.recommend, { min: 0, max: 1, step: 0.05 });
  assert.deepEqual(SETTINGS_RANGES.usdToCny, { min: 1, max: 20, step: 0.1 });
  assert.deepEqual([...LOCKED_SETTINGS_FIELDS], ["dataDir", "models", "benchPreset", "judgePreset"]);
});

test("clamp helpers fall back on non-numbers and respect bounds", () => {
  assert.equal(clampInt(undefined, 3, 0, 5), 3);
  assert.equal(clampInt(Number.NaN, 3, 0, 5), 3);
  assert.equal(clampInt("4.9", 0, 0, 5), 4);
  assert.equal(clampInt(-1, 3, 0, 5), 0);
  assert.equal(clampInt(99, 3, 0, 5), 5);
  assert.equal(clampNumber(undefined, 0.5, 0, 1), 0.5);
  assert.equal(clampNumber("0.25", 0, 0, 1), 0.25);
  assert.equal(clampNumber(-2, 0.5, 0, 1), 0);
  assert.equal(clampNumber(2, 0.5, 0, 1), 1);
});

test("mergeSettings without an overlay keeps the cordis defaults", () => {
  const defaults = baseConfig();
  const merged = mergeSettings(defaults, {});
  assert.deepEqual(merged.judge, defaults.judge);
  assert.equal(merged.maxCombos, 0);
  assert.equal(merged.maxParallelModels, 3);
  assert.equal(merged.perTaskTimeoutMs, 10_800_000);
  assert.equal(merged.perBatchTimeoutMs, 172_800_000);
  assert.equal(merged.autoRetries, 1);
  assert.equal(merged.judgeMaxAttempts, 2);
  assert.equal(merged.speedRuns, 3);
  assert.equal(merged.retentionBatches, 200);
  assert.deepEqual(merged.recommend, { quality: 0.45, speed: 0.2, cost: 0.2, stability: 0.15 });
  assert.equal(merged.pricing.usdToCny, 7.1);
  assert.equal(merged.dataDir, "/tmp/mr-settings");
  assert.deepEqual(merged.models, []);
});

test("mergeSettings clamps every numeric field to its range", () => {
  const merged = mergeSettings(baseConfig(), {
    maxCombos: 9_999,
    maxParallelModels: 0,
    perTaskTimeoutMs: 1,
    perBatchTimeoutMs: 10_000_000_000,
    autoRetries: 9,
    judgeMaxAttempts: 0,
    speedRuns: 99,
    retentionBatches: 0,
    pricing: { usdToCny: 100 },
  });
  assert.equal(merged.maxCombos, 512);
  assert.equal(merged.maxParallelModels, 1);
  assert.equal(merged.perTaskTimeoutMs, 60_000);
  assert.equal(merged.perBatchTimeoutMs, 604_800_000);
  assert.equal(merged.autoRetries, 2);
  assert.equal(merged.judgeMaxAttempts, 1);
  assert.equal(merged.speedRuns, 5);
  assert.equal(merged.retentionBatches, 1);
  assert.equal(merged.pricing.usdToCny, 20);
});

test("mergeSettings ignores runtime writes to locked fields", () => {
  const merged = mergeSettings(baseConfig(), {
    dataDir: "/tmp/elsewhere",
    models: ["ali/judge-a"],
    benchPreset: "evil",
    judgePreset: "evil",
  });
  assert.equal(merged.dataDir, "/tmp/mr-settings");
  assert.deepEqual(merged.models, []);
  assert.equal(merged.benchPreset, "model-radar-bench");
  assert.equal(merged.judgePreset, "model-radar-judge");
});

test("mergeSettings validates the judge shape but not the catalog", () => {
  const merged = mergeSettings(baseConfig(), { judge: { provider: "opencode-go", model: "m", reasoningEffort: "low" } });
  assert.deepEqual(merged.judge, { provider: "opencode-go", model: "m", reasoningEffort: "low" });
  const partial = mergeSettings(baseConfig(), { judge: { reasoningEffort: null } });
  assert.deepEqual(partial.judge, { provider: "ali", model: "judge-a", reasoningEffort: null });
});

test("normalizeRecommendWeights normalizes four weights to 1 with 4 decimals", () => {
  assert.deepEqual(normalizeRecommendWeights({ quality: 1, speed: 1, cost: 1, stability: 1 }), {
    quality: 0.25,
    speed: 0.25,
    cost: 0.25,
    stability: 0.25,
  });
  const partial = normalizeRecommendWeights({ quality: 1 }, DEFAULT_RECOMMEND);
  assert.equal(partial.quality, 0.6452);
  assert.equal(partial.speed, 0.129);
  assert.equal(partial.cost, 0.129);
  assert.equal(partial.stability, 0.0968);
  const total = Object.values(partial).reduce((sum, value) => sum + value, 0);
  // 4-decimal rounding may leave a tiny drift in the sum.
  assert.ok(Math.abs(total - 1) < 1e-3);
});

test("normalizeRecommendWeights clamps out-of-range weights and falls back when all zero", () => {
  const clamped = normalizeRecommendWeights({ quality: 5, speed: -1, cost: "nope", stability: 0.5 });
  for (const value of Object.values(clamped)) {
    assert.ok(value >= 0 && value <= 1);
  }
  const total = Object.values(clamped).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total - 1) < 1e-3);
  assert.deepEqual(normalizeRecommendWeights({ quality: 0, speed: 0, cost: 0, stability: 0 }), {
    quality: 0.45,
    speed: 0.2,
    cost: 0.2,
    stability: 0.15,
  });
  assert.deepEqual(normalizeRecommendWeights(undefined), { ...DEFAULT_RECOMMEND });
});

test("normalizeJudge merges partial patches and clears empty efforts", () => {
  assert.deepEqual(normalizeJudge(undefined, { provider: "ali", model: "m", reasoningEffort: "high" }), {
    provider: "ali",
    model: "m",
    reasoningEffort: "high",
  });
  assert.deepEqual(normalizeJudge({ reasoningEffort: "" }, { provider: "ali", model: "m", reasoningEffort: "high" }), {
    provider: "ali",
    model: "m",
    reasoningEffort: null,
  });
  assert.deepEqual(normalizeJudge({ provider: "x" }, { provider: "ali", model: "m", reasoningEffort: null }), {
    provider: "x",
    model: "m",
    reasoningEffort: null,
  });
});

test("resolveJudgeSettings accepts catalog models and their efforts", () => {
  const catalog = fakeCatalog();
  assert.deepEqual(resolveJudgeSettings(catalog, { provider: "ali", model: "judge-a", reasoningEffort: "high" }), {
    provider: "ali",
    model: "judge-a",
    reasoningEffort: "high",
  });
  // Missing effort -> model default.
  assert.deepEqual(resolveJudgeSettings(catalog, { provider: "ali", model: "judge-a" }), {
    provider: "ali",
    model: "judge-a",
    reasoningEffort: "low",
  });
  // A model without efforts only accepts null/"default".
  assert.deepEqual(resolveJudgeSettings(catalog, { provider: "ali", model: "plain", reasoningEffort: "default" }), {
    provider: "ali",
    model: "plain",
    reasoningEffort: null,
  });
  assert.deepEqual(resolveJudgeSettings(catalog, { provider: "ali", model: "plain" }), {
    provider: "ali",
    model: "plain",
    reasoningEffort: null,
  });
  // Partial patches fall back to the current judge.
  assert.deepEqual(
    resolveJudgeSettings(catalog, { reasoningEffort: "high" }, { provider: "ali", model: "judge-a", reasoningEffort: "low" }),
    { provider: "ali", model: "judge-a", reasoningEffort: "high" },
  );
});

test("resolveJudgeSettings rejects unknown providers/models and unsupported efforts", () => {
  const catalog = fakeCatalog();
  const rejects = (patch, fallback) => {
    assert.throws(
      () => resolveJudgeSettings(catalog, patch, fallback),
      (error) => error instanceof Error && error.code === "settings",
    );
  };
  rejects({ provider: "nope", model: "judge-a" });
  rejects({ provider: "ali", model: "nope" });
  rejects({ provider: "ali", model: "judge-a", reasoningEffort: "medium" });
  rejects({ provider: "ali", model: "plain", reasoningEffort: "high" });
  rejects({ provider: 123, model: "judge-a" });
  rejects({ provider: "ali", model: "" });
});

test("writableSettings round-trips through mergeSettings", () => {
  const effective = mergeSettings(baseConfig(), {
    maxCombos: 6,
    judge: { provider: "ali", model: "judge-a", reasoningEffort: "low" },
    recommend: { quality: 0.6, speed: 0.1, cost: 0.2, stability: 0.1 },
    pricing: { usdToCny: 6.5 },
  });
  const snapshot = writableSettings(effective);
  assert.equal(snapshot.maxCombos, 6);
  assert.deepEqual(snapshot.judge, { provider: "ali", model: "judge-a", reasoningEffort: "low" });
  assert.deepEqual(snapshot.recommend, { quality: 0.6, speed: 0.1, cost: 0.2, stability: 0.1 });
  assert.equal(snapshot.pricing.usdToCny, 6.5);
  const restored = mergeSettings(baseConfig(), snapshot);
  assert.equal(restored.maxCombos, 6);
  assert.deepEqual(restored.judge, snapshot.judge);
  assert.deepEqual(restored.recommend, snapshot.recommend);
  assert.equal(restored.pricing.usdToCny, 6.5);
});

test("readSettingsSync returns null for missing or corrupted files", async (t) => {
  const dir = await tempDir(t);
  assert.equal(readSettingsSync(dir), null);
  assert.equal(readSettingsSync(""), null);
  assert.equal(readSettingsSync(undefined), null);

  const file = settingsPath(dir);
  await writeFile(file, "{not json", "utf8");
  assert.equal(readSettingsSync(dir), null);
  await writeFile(file, "[]", "utf8");
  assert.equal(readSettingsSync(dir), null);
  await writeFile(file, "null", "utf8");
  assert.equal(readSettingsSync(dir), null);
  await writeFile(file, JSON.stringify({ version: 1, updatedAt: 123, values: { maxCombos: 2 } }), "utf8");
  const loaded = readSettingsSync(dir);
  assert.equal(loaded.version, 1);
  assert.equal(loaded.updatedAt, 123);
  assert.equal(loaded.values.maxCombos, 2);
  await writeFile(file, JSON.stringify({ version: 2, values: ["bad"] }), "utf8");
  const fallback = readSettingsSync(dir);
  assert.equal(fallback.version, 2);
  assert.deepEqual(fallback.values, {});
});

test("writeSettings persists atomically and leaves no temp file behind", async (t) => {
  const dir = await tempDir(t);
  const written = await writeSettings(dir, { values: { maxCombos: 2, judge: { provider: "ali" } }, updatedAt: 456 });
  assert.equal(written.version, SETTINGS_VERSION);
  assert.equal(written.updatedAt, 456);

  const file = settingsPath(dir);
  const parsed = JSON.parse(await readFile(file, "utf8"));
  assert.equal(parsed.version, SETTINGS_VERSION);
  assert.equal(parsed.updatedAt, 456);
  assert.equal(parsed.values.maxCombos, 2);
  assert.deepEqual(await readdir(dir), ["settings.json"]);

  const loaded = readSettingsSync(dir);
  assert.equal(loaded.updatedAt, 456);
  assert.equal(loaded.values.maxCombos, 2);

  // Overwriting replaces the file, not appends to it.
  await writeSettings(dir, { values: { maxCombos: 3 }, updatedAt: 789 });
  assert.equal(readSettingsSync(dir).updatedAt, 789);
  assert.equal(readSettingsSync(dir).values.maxCombos, 3);
  assert.deepEqual(await readdir(dir), ["settings.json"]);
});

test("writeSettings creates a missing data directory", async (t) => {
  const root = await tempDir(t);
  const dir = path.join(root, "nested", "model-radar");
  await writeSettings(dir, { values: {}, updatedAt: 1 });
  assert.equal(readSettingsSync(dir).updatedAt, 1);
});
