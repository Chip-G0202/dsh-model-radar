// dsh-model-radar — Host half.
//
// Responsibilities:
//   - register the same-origin /dsh-model-radar/* routes (browser never sees
//     credentials or the Host LLM service);
//   - own the benchmark store, the batch runner and the perf report;
//   - keep all model/provider knowledge dynamic through the live LLM service.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { readCatalog, invalidateCatalog, selectableCombos, normalizeSelection, findModel, firstSelectableModel } from "./lib/catalog.js";
import { Store, resolveDataDir } from "./lib/store.js";
import { Runner, canResumeBatch, canRerunBatch, stripLiveBatch } from "./lib/runner.js";
import { buildPerfReport } from "./lib/perf.js";
import { normalizePricing } from "./lib/pricing.js";
import {
  DEFAULT_RECOMMEND,
  LOCKED_SETTINGS_FIELDS,
  SETTINGS_RANGES,
  clampInt,
  clampNumber,
  mergeSettings,
  normalizeRecommendWeights,
  readSettingsSync,
  resolveJudgeSettings,
  writableSettings,
  writeSettings,
} from "./lib/settings.js";
import {
  TASK_VERSION,
  RUBRIC_VERSION,
  TASKS,
  assetHashes,
  pompeiiAssetPath,
  POMPEII_NODES,
  GOLD_EDGES,
} from "./lib/tasks.js";

const ROUTE_PREFIX = "/dsh-model-radar/";
const BENCH_PRESET_ID = "model-radar-bench";
const JUDGE_PRESET_ID = "model-radar-judge";

const DEFAULT_CONFIG = {
  judge: { provider: "", model: "", reasoningEffort: null },
  models: [],
  maxCombos: 0,
  maxParallelModels: 3,
  perTaskTimeoutMs: 10_800_000,
  perBatchTimeoutMs: 172_800_000,
  autoRetries: 1,
  judgeMaxAttempts: 2,
  speedRuns: 3,
  dataDir: "",
  retentionBatches: 200,
  recommend: { ...DEFAULT_RECOMMEND },
  benchPreset: BENCH_PRESET_ID,
  judgePreset: JUDGE_PRESET_ID,
  pricing: { usdToCny: 7.1, fallbackModel: "deepseek-v4.1-flash", models: {} },
};

function normalizeConfig(config) {
  const raw = config !== null && typeof config === "object" ? config : {};
  const judge = raw.judge !== null && typeof raw.judge === "object" ? raw.judge : {};
  const models = Array.isArray(raw.models)
    ? raw.models.filter((entry) => typeof entry === "string" && entry.trim() !== "").map((entry) => entry.trim())
    : [];
  return {
    judge: {
      provider: typeof judge.provider === "string" && judge.provider !== "" ? judge.provider : DEFAULT_CONFIG.judge.provider,
      model: typeof judge.model === "string" && judge.model !== "" ? judge.model : DEFAULT_CONFIG.judge.model,
      reasoningEffort:
        judge.reasoningEffort === null || judge.reasoningEffort === undefined || judge.reasoningEffort === ""
          ? null
          : String(judge.reasoningEffort),
    },
    models,
    maxCombos: clampInt(raw.maxCombos, DEFAULT_CONFIG.maxCombos, 0, 512),
    maxParallelModels: clampInt(raw.maxParallelModels, DEFAULT_CONFIG.maxParallelModels, 1, 8),
    perTaskTimeoutMs: clampInt(raw.perTaskTimeoutMs, DEFAULT_CONFIG.perTaskTimeoutMs, 60_000, 14_400_000),
    perBatchTimeoutMs: clampInt(raw.perBatchTimeoutMs, DEFAULT_CONFIG.perBatchTimeoutMs, 300_000, 604_800_000),
    autoRetries: clampInt(raw.autoRetries, DEFAULT_CONFIG.autoRetries, 0, 2),
    judgeMaxAttempts: clampInt(raw.judgeMaxAttempts, DEFAULT_CONFIG.judgeMaxAttempts, 1, 4),
    speedRuns: clampInt(raw.speedRuns, DEFAULT_CONFIG.speedRuns, 0, 5),
    dataDir: typeof raw.dataDir === "string" ? raw.dataDir : "",
    retentionBatches: clampInt(raw.retentionBatches, DEFAULT_CONFIG.retentionBatches, 1, 5000),
    recommend: normalizeRecommendWeights(raw.recommend),
    benchPreset: typeof raw.benchPreset === "string" && raw.benchPreset !== "" ? raw.benchPreset : BENCH_PRESET_ID,
    judgePreset: typeof raw.judgePreset === "string" && raw.judgePreset !== "" ? raw.judgePreset : JUDGE_PRESET_ID,
    perfWeights:
      raw.perfWeights !== null && typeof raw.perfWeights === "object" && !Array.isArray(raw.perfWeights)
        ? { ...raw.perfWeights }
        : undefined,
    pricing: normalizePricing(raw.pricing),
  };
}

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(value));
}

function errorJson(res, status, code, message, extra) {
  json(res, status, { code, error: message, ...(extra ?? {}) });
}

async function readBody(req, limitBytes = 1_000_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limitBytes) {
      const error = new Error("request body too large");
      error.code = "body-too-large";
      throw error;
    }
    chunks.push(chunk);
  }
  if (total === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("request body is not valid JSON");
    error.code = "bad-json";
    throw error;
  }
}

function requestUrl(req) {
  return new URL(typeof req?.url === "string" ? req.url : ROUTE_PREFIX, "http://dsh.local");
}

/**
 * @param hashes asset hashes
 * @param locked while a batch runs, the gold layout and the solved reference
 *   image must not be reachable through the local HTTP routes (candidate bash
 *   can reach localhost); the client paints the graph from batch data after the
 *   batch settles instead.
 */
function metaPayload(hashes, locked = false) {
  return {
    name: "dsh-model-radar",
    taskVersion: TASK_VERSION,
    rubricVersion: RUBRIC_VERSION,
    tasks: TASKS,
    assets: hashes,
    locked,
    pompeii: {
      nodes: locked ? [] : POMPEII_NODES,
      goldEdges: locked ? [] : GOLD_EDGES,
      assets: {
        question: `${ROUTE_PREFIX}task-asset?name=question.png`,
        reference: locked ? null : `${ROUTE_PREFIX}task-asset?name=reference.png`,
      },
    },
    routePrefix: ROUTE_PREFIX,
  };
}

/**
 * Shared body of `GET /settings` and `POST /settings`. `effective` is the live
 * config the runner is using; `defaults` is the cordis config layer used by
 * "restore defaults". Locked fields are shown but never written back.
 */
function settingsPayload({ config, defaults, dataDir, updatedAt = 0, running = false }) {
  const pick = (source, resolvedDataDir) => {
    const judge = source?.judge !== null && typeof source?.judge === "object" ? source.judge : {};
    const pricing = source?.pricing !== null && typeof source?.pricing === "object" ? source.pricing : {};
    const limits = SETTINGS_RANGES;
    return {
      judge: {
        provider: typeof judge.provider === "string" ? judge.provider : null,
        model: typeof judge.model === "string" ? judge.model : null,
        reasoningEffort: judge.reasoningEffort ?? null,
      },
      maxCombos: clampInt(source?.maxCombos, DEFAULT_CONFIG.maxCombos, limits.maxCombos.min, limits.maxCombos.max),
      maxParallelModels: clampInt(
        source?.maxParallelModels,
        DEFAULT_CONFIG.maxParallelModels,
        limits.maxParallelModels.min,
        limits.maxParallelModels.max,
      ),
      perTaskTimeoutMs: clampInt(
        source?.perTaskTimeoutMs,
        DEFAULT_CONFIG.perTaskTimeoutMs,
        limits.perTaskTimeoutMs.min,
        limits.perTaskTimeoutMs.max,
      ),
      perBatchTimeoutMs: clampInt(
        source?.perBatchTimeoutMs,
        DEFAULT_CONFIG.perBatchTimeoutMs,
        limits.perBatchTimeoutMs.min,
        limits.perBatchTimeoutMs.max,
      ),
      autoRetries: clampInt(source?.autoRetries, DEFAULT_CONFIG.autoRetries, limits.autoRetries.min, limits.autoRetries.max),
      judgeMaxAttempts: clampInt(
        source?.judgeMaxAttempts,
        DEFAULT_CONFIG.judgeMaxAttempts,
        limits.judgeMaxAttempts.min,
        limits.judgeMaxAttempts.max,
      ),
      speedRuns: clampInt(source?.speedRuns, DEFAULT_CONFIG.speedRuns, limits.speedRuns.min, limits.speedRuns.max),
      retentionBatches: clampInt(
        source?.retentionBatches,
        DEFAULT_CONFIG.retentionBatches,
        limits.retentionBatches.min,
        limits.retentionBatches.max,
      ),
      recommend: normalizeRecommendWeights(source?.recommend),
      pricing: {
        usdToCny: clampNumber(pricing.usdToCny, DEFAULT_CONFIG.pricing.usdToCny, limits.usdToCny.min, limits.usdToCny.max),
        fallbackModel: typeof pricing.fallbackModel === "string" ? pricing.fallbackModel : "",
        // Per-model rate overrides stay in the cordis config; reserved here for shape stability.
        models: {},
      },
      dataDir: resolvedDataDir,
      models: Array.isArray(source?.models) ? [...source.models] : [],
    };
  };
  return {
    ok: true,
    running,
    effective: pick(config, dataDir),
    defaults: pick(defaults, resolveDataDir(defaults)),
    ranges: SETTINGS_RANGES,
    locked: [...LOCKED_SETTINGS_FIELDS],
    updatedAt,
  };
}

export const inject = ["webServer", "agentPresets"];

/**
 * Register the two plugin-owned presets every benchmark agent mounts.
 * `model-radar-bench` is the fair candidate toolset (file tools + bash only);
 * `model-radar-judge` has no tools at all, so the judge can only write text.
 */
function registerRadarPresets(ctx) {
  const presets = ctx.get("agentPresets");
  if (presets === undefined) {
    return Promise.resolve({ ok: false, error: "agentPresets service is unavailable", dispose: async () => {} });
  }
  const bench = {
    id: BENCH_PRESET_ID,
    name: "Model radar bench",
    description: "File tools and bash only, used by Model radar candidate runs.",
    order: 900,
    plugins: [
      {
        id: "persona",
        name: "@deepseek-ai/dsh-persona",
        config: { prefix: "You are a coding agent powered by the {{model}} model." },
      },
      { id: "time-context", name: "@deepseek-ai/dsh-time-context" },
      { id: "tool-bash", name: "@deepseek-ai/dsh-tool-bash" },
      { id: "tool-fs", name: "@deepseek-ai/dsh-tool-fs", config: { applyPatch: false } },
      { id: "tool-fs-search", name: "@deepseek-ai/dsh-tool-fs-search", config: { sampleOverCapGlobResults: false } },
    ],
  };
  const judge = {
    id: JUDGE_PRESET_ID,
    name: "Model radar judge",
    description: "Text-only judge session used by Model radar batches.",
    order: 901,
    plugins: [
      {
        id: "persona",
        name: "@deepseek-ai/dsh-persona",
        config: {
          prefix: "You are a benchmark judge. You answer with the requested JSON or the requested summary only.",
        },
      },
    ],
  };
  return Promise.all([presets.register(bench), presets.register(judge)])
    .then((disposers) => ({
      ok: true,
      dispose: async () => {
        for (const dispose of disposers) {
          try {
            await dispose();
          } catch {
            // A preset that already unloaded needs no further action.
          }
        }
      },
    }))
    .catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      dispose: async () => {},
    }));
}

export function apply(ctx, config) {
  // Cordis config is the default layer; <dataDir>/settings.json is the
  // persisted overlay the settings page can change without a plugin reload.
  const defaults = normalizeConfig(config);
  const dataDir = resolveDataDir(defaults);
  const storedSettings = readSettingsSync(dataDir);
  // One mutable object: the runner holds this reference, so a saved setting is
  // visible without rebuilding it (a running batch keeps reading it, the
  // settings page tells the user changes apply to the next batch).
  const cfg = mergeSettings(defaults, storedSettings?.values ?? {});
  const settingsState = { updatedAt: storedSettings?.updatedAt ?? 0 };
  const store = new Store({ dir: dataDir, retentionBatches: cfg.retentionBatches });
  const ready = store.init();
  const hashesPromise = assetHashes().catch(() => ({}));
  const presetRegistration = registerRadarPresets(ctx);
  ctx.effect(() => () => {
    void presetRegistration.then((registration) => registration.dispose()).catch(() => undefined);
  });
  const presetReady = presetRegistration;
  // Resolve output budgets from the live DSH model catalog, never hard-code them.
  const resolveModelLimit = async (provider, model) => {
    try {
      const catalog = await readCatalog(ctx, {});
      const found = findModel(catalog, provider, model);
      const limit = Number(found?.model?.defaultMaxTokens);
      return Number.isFinite(limit) && limit > 0 ? limit : null;
    } catch {
      return null;
    }
  };
  const runner = new Runner({ ctx, config: cfg, store, ready, presetReady, resolveModelLimit });

  const handler = async (req, res) => {
    try {
      const url = requestUrl(req);
      const pathname = url.pathname.replace(/\/+$/, "");
      const method = (req.method ?? "GET").toUpperCase();

      if (method === "GET" && pathname === "/dsh-model-radar/health") {
        await ready;
        json(res, 200, {
          ok: true,
          running: runner.current() !== null,
          dataDir: store.dataDir,
          judge: cfg.judge,
          limits: {
            perTaskTimeoutMs: cfg.perTaskTimeoutMs,
            perBatchTimeoutMs: cfg.perBatchTimeoutMs,
            autoRetries: cfg.autoRetries,
            judgeMaxAttempts: cfg.judgeMaxAttempts,
            speedRuns: cfg.speedRuns,
            retentionBatches: cfg.retentionBatches,
          },
        });
        return;
      }

      if (method === "GET" && pathname === "/dsh-model-radar/meta") {
        await ready;
        json(res, 200, metaPayload(await hashesPromise, runner.current() !== null));
        return;
      }

      if (method === "GET" && pathname === "/dsh-model-radar/catalog") {
        await ready;
        const catalog = await readCatalog(ctx, { fresh: url.searchParams.get("fresh") === "1" });
        json(res, 200, {
          ...catalog,
          judge: cfg.judge,
          limits: {
            maxCombos: cfg.maxCombos,
            maxParallelModels: cfg.maxParallelModels,
            perTaskTimeoutMs: cfg.perTaskTimeoutMs,
            perBatchTimeoutMs: cfg.perBatchTimeoutMs,
            autoRetries: cfg.autoRetries,
            judgeMaxAttempts: cfg.judgeMaxAttempts,
            speedRuns: cfg.speedRuns,
            retentionBatches: cfg.retentionBatches,
            recommend: normalizeRecommendWeights(cfg.recommend),
          },
          selectable: selectableCombos(catalog, { whitelist: cfg.models }),
        });
        return;
      }

      if (method === "GET" && pathname === "/dsh-model-radar/settings") {
        await ready;
        json(
          res,
          200,
          settingsPayload({
            config: cfg,
            defaults,
            dataDir: store.dataDir,
            updatedAt: settingsState.updatedAt,
            running: runner.current() !== null,
          }),
        );
        return;
      }

      if (method === "POST" && pathname === "/dsh-model-radar/settings") {
        await ready;
        const rawBody = await readBody(req);
        const body = rawBody !== null && typeof rawBody === "object" ? rawBody : {};
        const running = runner.current() !== null;
        try {
          if (body.reset === true) {
            // Drop the persisted overlay: the cordis config becomes effective again.
            Object.assign(cfg, mergeSettings(defaults, {}));
          } else {
            const rawValues = body.values !== null && typeof body.values === "object" && !Array.isArray(body.values) ? body.values : {};
            const merged = mergeSettings(cfg, rawValues);
            if (rawValues.judge !== undefined && rawValues.judge !== null) {
              // Judge selection must exist in the live catalog (and its effort
              // must be supported) instead of being silently downgraded.
              merged.judge = resolveJudgeSettings(await readCatalog(ctx, {}), rawValues.judge, cfg.judge);
            }
            Object.assign(cfg, merged);
          }
          store.retentionBatches = cfg.retentionBatches;
          settingsState.updatedAt = Date.now();
          await writeSettings(store.dataDir, {
            values: body.reset === true ? {} : writableSettings(cfg),
            updatedAt: settingsState.updatedAt,
          });
        } catch (error) {
          if (error?.code === "settings") {
            errorJson(res, 400, "settings", error instanceof Error ? error.message : String(error));
            return;
          }
          throw error;
        }
        json(res, 200, {
          ...settingsPayload({
            config: cfg,
            defaults,
            dataDir: store.dataDir,
            updatedAt: settingsState.updatedAt,
            running,
          }),
          saved: true,
          ...(running ? { appliesTo: "next-batch" } : {}),
        });
        return;
      }

      if (method === "GET" && pathname === "/dsh-model-radar/batches") {
        await ready;
        const batches = store.listBatches().map((entry) => ({
          ...entry,
          rerunnable: canRerunBatch(entry),
          resumable:
            entry.status !== "running" &&
            Number(entry.runCount) > Number(entry.doneCount) &&
            entry.taskVersion === TASK_VERSION &&
            entry.rubricVersion === RUBRIC_VERSION,
        }));
        json(res, 200, { batches });
        return;
      }

      if (method === "GET" && pathname.startsWith("/dsh-model-radar/batches/")) {
        await ready;
        const id = decodeURIComponent(pathname.slice("/dsh-model-radar/batches/".length));
        const batch = await store.getBatch(id);
        if (batch === null) {
          errorJson(res, 404, "not-found", `unknown batch: ${id}`);
          return;
        }
        // A running batch must not leak candidates' answers to other candidates.
        const payload = runner.current() !== null ? stripLiveBatch(batch) : batch;
        json(res, 200, { batch: { ...payload, resumable: canResumeBatch(batch), rerunnable: canRerunBatch(batch) } });
        return;
      }

      if (method === "GET" && pathname === "/dsh-model-radar/report") {
        await ready;
        const range = url.searchParams.get("range") ?? "month";
        const report = await buildPerfReport(ctx, {
          range,
          config: cfg,
          excludeSessionIds: store.evalSessionIds,
          fresh: url.searchParams.get("fresh") === "1",
          cacheDir: store.dataDir,
        });
        json(res, 200, report);
        return;
      }

      if (method === "GET" && pathname === "/dsh-model-radar/run") {
        await ready;
        const batchId = url.searchParams.get("batch");
        const status = await runner.status(batchId);
        json(res, 200, status);
        return;
      }

      if (method === "POST" && pathname === "/dsh-model-radar/run") {
        await ready;
        const body = await readBody(req);
        const catalog = await readCatalog(ctx, {});
        let selection;
        try {
          selection = normalizeSelection(catalog, body.selection, {
            maxCombos: cfg.maxCombos,
            whitelist: cfg.models,
          });
        } catch (error) {
          errorJson(res, 400, error.code ?? "selection", error.message, {
            maxCombos: cfg.maxCombos,
          });
          return;
        }
        let judge = { ...cfg.judge };
        if (body.judge !== null && typeof body.judge === "object") {
          const provider = typeof body.judge.provider === "string" ? body.judge.provider : "";
          const model = typeof body.judge.model === "string" ? body.judge.model : "";
          if (provider !== "" && model !== "") {
            const found = catalog.providers
              .find((entry) => entry.id === provider)
              ?.models.find((entry) => entry.id === model);
            if (found === undefined) {
              errorJson(res, 400, "judge", `unknown judge model: ${provider}/${model}`);
              return;
            }
            const requested =
              typeof body.judge.reasoningEffort === "string" && body.judge.reasoningEffort !== ""
                ? body.judge.reasoningEffort
                : null;
            const effort =
              found.efforts.length === 0
                ? null
                : requested !== null && found.efforts.some((entry) => entry.id === requested)
                  ? requested
                  : found.defaultEffort;
            judge = { provider, model, reasoningEffort: effort };
          }
        }
        if (judge.provider === "" || judge.model === "") {
          // No judge configured (fresh install): fall back to the first model in
          // the live catalog so the first batch can start without configuration.
          const fallback = firstSelectableModel(catalog);
          if (fallback === null) {
            errorJson(res, 400, "judge", "no model available to use as judge");
            return;
          }
          judge = fallback;
        }
        try {
          const batch = await runner.start({ selection, judge });
          json(res, 202, { batch });
        } catch (error) {
          const status = error.code === "busy" ? 409 : 500;
          errorJson(res, status, error.code ?? "run", error.message);
        }
        return;
      }

      if (method === "GET" && pathname === "/dsh-model-radar/task-asset") {
        const name = url.searchParams.get("name") ?? "";
        if (name !== "question.png" && name !== "reference.png") {
          errorJson(res, 404, "asset-not-found", "asset not found");
          return;
        }
        if (name === "reference.png" && runner.current() !== null) {
          // The solved assembly is the Pompeii answer; hide it while candidates run.
          errorJson(res, 404, "asset-locked", "reference asset is unavailable while a batch is running");
          return;
        }
        const file = pompeiiAssetPath(name);
        const info = await stat(file).catch(() => null);
        if (info === null || !info.isFile()) {
          errorJson(res, 404, "asset-not-found", "asset not found");
          return;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "image/png");
        res.setHeader("content-length", String(info.size));
        res.setHeader("cache-control", "public, max-age=86400");
        res.setHeader("x-content-type-options", "nosniff");
        createReadStream(file).pipe(res);
        return;
      }

      if (method === "GET" && pathname === "/dsh-model-radar/artifact") {
        await ready;
        if (runner.current() !== null) {
          errorJson(res, 409, "artifact-locked", "artifacts are unavailable while a batch is running");
          return;
        }
        const file = await runner.artifactPath({
          batchId: url.searchParams.get("batch") ?? "",
          runId: url.searchParams.get("run") ?? "",
          file: url.searchParams.get("file") ?? "",
        });
        if (file === null) {
          errorJson(res, 404, "artifact-not-found", "artifact not found");
          return;
        }
        const info = await stat(file).catch(() => null);
        if (info === null || !info.isFile()) {
          errorJson(res, 404, "artifact-not-found", "artifact not found");
          return;
        }
        const extension = path.extname(file).toLowerCase();
        const types = {
          ".svg": "image/svg+xml; charset=utf-8",
          ".html": "text/html; charset=utf-8",
          ".json": "application/json; charset=utf-8",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".txt": "text/plain; charset=utf-8",
          ".css": "text/css; charset=utf-8",
        };
        res.statusCode = 200;
        res.setHeader("content-type", types[extension] ?? "application/octet-stream");
        res.setHeader("content-length", String(info.size));
        res.setHeader("cache-control", "private, max-age=60");
        res.setHeader("x-content-type-options", "nosniff");
        res.setHeader("content-disposition", `inline; filename="${path.basename(file).replace(/"/g, "")}"`);
        if (extension === ".html") {
          res.setHeader(
            "content-security-policy",
            "sandbox allow-scripts; default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:",
          );
        }
        createReadStream(file).pipe(res);
        return;
      }

      if (method === "POST" && pathname === "/dsh-model-radar/resume") {
        await ready;
        const body = await readBody(req);
        const payload = body !== null && typeof body === "object" ? body : {};
        const batchId = typeof payload.batchId === "string" ? payload.batchId : "";
        const runIds = Array.isArray(payload.runIds)
          ? payload.runIds
          : typeof payload.runId === "string" && payload.runId !== ""
            ? [payload.runId]
            : [];
        // The rerun dialog sends comboKeys/taskIds instead of runIds; the runner
        // resolves both forms (runIds wins when both are present).
        try {
          const resumed = await runner.resume(batchId, {
            runIds,
            comboKeys: Array.isArray(payload.comboKeys) ? payload.comboKeys : undefined,
            taskIds: Array.isArray(payload.taskIds) ? payload.taskIds : undefined,
          });
          json(res, 202, resumed);
        } catch (error) {
          const status =
            error?.code === "busy" || error?.code === "nothing-to-resume" || error?.code === "version-mismatch"
              ? 409
              : error?.code === "not-found"
                ? 404
                : error?.code === "batch" || error?.code === "empty-selection"
                  ? 400
                  : 500;
          errorJson(res, status, error?.code ?? "resume", error instanceof Error ? error.message : String(error));
        }
        return;
      }

      if (method === "POST" && pathname === "/dsh-model-radar/stop") {
        await ready;
        const body = await readBody(req);
        const batchId = typeof body.batchId === "string" ? body.batchId : undefined;
        const stopped = await runner.stop(batchId);
        json(res, 200, { stopped });
        return;
      }

      if (method === "POST" && pathname === "/dsh-model-radar/catalog/refresh") {
        invalidateCatalog();
        json(res, 200, { ok: true });
        return;
      }

      errorJson(res, 404, "not-found", `unknown route: ${method} ${pathname}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error?.code === "body-too-large" || error?.code === "bad-json" ? 400 : 500;
      errorJson(res, status, error?.code ?? "internal", message);
    }
  };

  ctx.effect(() => {
    const dispose = ctx.webServer.register({ kind: "prefix", path: "/dsh-model-radar", handler });
    return () => {
      try {
        dispose();
      } catch {
        // Teardown must not throw from one failed route removal.
      }
      runner.dispose();
      presetReady.then((state) => state.dispose()).catch(() => undefined);
    };
  }, "dsh-model-radar: routes and runner");
}