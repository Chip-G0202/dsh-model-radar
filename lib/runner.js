// dsh-model-radar — batch runner.
//
// One batch creates a single "judge session" whose main model is the selected
// judge. Every candidate run is a fresh child agent of that session (origin
// "subagent"), with its own session, its own working directory, its own model
// route and a restricted tool set (file tools + bash only). Results are
// injected back into the judge session, and the judge writes the batch summary
// once every lane has settled.
//
// Lanes: one lane per model; within a lane, reasoning efforts and tasks run
// serially; up to maxParallelModels lanes run concurrently.

import { createHash, randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  TASKS,
  TASK_VERSION,
  RUBRIC_VERSION,
  buildPrompt,
  collectRunArtifacts,
  judgeRubric,
  prepareRunDir,
  pompeiiGold,
} from "./tasks.js";
import { comboTotal, foldUsage, gradeJudgeResult, lastAssistantText, scoreCandy, scorePompeii, turnCutByMaxTokens } from "./scoring.js";
import { judgeTask } from "./judge.js";
import { priceUsage } from "./pricing.js";
import { attachIsolationAudit } from "./isolation.js";

const CHILD_TOOLS = new Set(["read", "write", "edit", "glob", "grep", "bash", "read_image"]);
const TOOL_POLICY = "本次运行只能使用文件读取/写入/搜索、read_image 与 bash 工具；不要使用团队协作、子智能体、计划、网络或插件管理工具。只在当前工作目录内读写文件；不要读取工作目录以外的任何路径，也不要查找其他批次的答案。\n\n";
const SPEED_PROMPT =
  "请写一段约 300 token 的 TypeScript 代码并附一句说明：实现一个有并发上限、失败重试和取消支持的异步任务队列。直接输出答案，不要调用任何工具。";
const SUMMARY_TIMEOUT_MS = 900_000;
const SPEED_TIMEOUT_MS = 300_000;
/** Reason used when the plugin itself is unloaded (disabled, reloaded or the app quits). */
const INTERRUPT_REASON = "plugin-reload";
const INTERRUPT_MESSAGE = "插件被禁用或重载，批次已中断；可点「继续运行」从剩余题目接着跑";
const SUMMARY_INSTRUCTION = `以上是本批次全部候选模型的评测结果。请以评测主持人的身份，用中文写一段 300 字以内的批次汇总，只输出汇总正文：
1) 最高分与最低分组合、分差；
2) 四道题里哪道题拉开了差距；
3) 费用与耗时方面的观察；
4) 一句话结论。
不要调用任何工具，不要复述完整表格。`;

function now() {
  return Date.now();
}

function withToolPolicy(prompt) {
  return `${TOOL_POLICY}${prompt}`;
}

/**
 * `agent.cancel()` is a promise on some DSH builds and a plain (possibly
 * undefined) value on others. Calling `.catch` blindly killed the whole host
 * when a batch hit its timeout, so every fire-and-forget cancel goes through
 * this helper.
 */
export function cancelAgentQuietly(handle, kind = "user") {
  try {
    const result = handle?.agent?.cancel?.({ kind });
    if (result !== null && result !== undefined && typeof result.catch === "function") {
      result.catch(() => undefined);
    }
  } catch {
    // Cancellation is best effort and must never throw into a timer.
  }
}

/**
 * Best-effort command guard for benchmark runs: reject paths that can reach the
 * harness store, the user's home, or sibling runs. Bash still runs with the
 * deployment's own confinement; this only closes the obvious answer leaks.
 */
/** True when a file-tool target resolves (including symlinks) outside the run root. */
export function toolPathEscapesWorkspace(runDir, target) {
  if (runDir === undefined || runDir === null) return false;
  if (typeof target !== "string" || target === "") return false;
  const root = path.resolve(runDir);
  const resolved = path.resolve(root, target);
  const inside = (candidate, base) => candidate === base || candidate.startsWith(`${base}${path.sep}`);
  // macOS spells /var two ways; accept the target under either spelling.
  const roots = new Set([root]);
  if (root.startsWith("/private/")) roots.add(root.slice("/private".length));
  else roots.add(`/private${root}`);
  if ([...roots].some((base) => inside(resolved, base))) {
    try {
      const realTarget = realpathSync(resolved);
      const realRoot = realpathSync(root);
      return !inside(realTarget, realRoot);
    } catch {
      return false;
    }
  }
  try {
    const realTarget = realpathSync(resolved);
    const realRoot = realpathSync(root);
    return !inside(realTarget, realRoot);
  } catch {
    return true;
  }
}

export function commandEscapesWorkspace(command, runDir) {
  const raw = String(command ?? "");
  // The run's own cwd legitimately contains "dsh-model-radar-runs"; scrub every
  // spelling of it (macOS /var vs /private/var) before matching leak tokens.
  let text = raw;
  if (runDir !== undefined && runDir !== null) {
    const root = path.resolve(runDir);
    const forms = new Set([root]);
    try {
      forms.add(realpathSync(root));
    } catch {
      // A not-yet-created run dir keeps its resolved spelling.
    }
    for (const form of [...forms]) {
      if (form.startsWith("/private/")) forms.add(form.slice("/private".length));
      else forms.add(`/private${form}`);
    }
    for (const form of forms) text = text.split(form).join("<RUN>");
  }
  if (text.includes(".dsh/") || text.includes(".dsh\\")) return true;
  if (/(^|[\s"'`=;(])\.dsh([\\/]|[\s"'`;)]|$)/.test(text)) return true;
  if (text.includes(os.homedir())) return true;
  if (/\/Users\//.test(text)) return true;
  if (text.includes("$HOME") || text.includes("${HOME}")) return true;
  // Every run lives in a random directory under the system temp root. Reading
  // the shared temp root (or $TMPDIR) would expose sibling runs' artifacts, so
  // it is out of scope just like the home directory.
  if (/var\/folders|private\/var|\$TMPDIR|\$\{TMPDIR\}/i.test(text)) return true;
  if (/(^|[\s"'`=;(])\/tmp([\/\s"'`;)]|$)/.test(text)) return true;
  // `~` is also numpy's bitwise-not; only a path-like tilde counts as home.
  if (/(^|[\s"'`=;(])~(?=[\\/"'`;)]|$)/.test(text)) return true;
  if (/(^|[\s"'`=;(])\.\.([\\/]|[\s"'`;)]|$)/.test(text)) return true;
  // Benchmark plugin / gold assets / harness store / local plugin routes.
  if (/dsh-model-radar|task-asset|gold\.json|reference\.png|codexradar/i.test(text)) return true;
  if (/(127\.0\.0\.1|localhost|0\.0\.0\.0)/i.test(text)) return true;
  if (/\/batches|\/artifact|\/dsh-model-radar/i.test(text)) return true;
  // Network clients, but not variables such as `nc=4` inside a Python heredoc.
  if (/(^|;|&&|\|\||\n)\s*(?:sudo\s+)?(curl|wget|nc|ncat|telnet|ssh|scp)\b(?![\s]*=)/i.test(text)) return true;
  if (/(requests\.(get|post|put|patch|delete|request|Session)\b|urllib\.request|http\.client|socket\.socket\b|websocket\.(create_connection|WebSocketApp))/i.test(text))
    return true;
  return false;
}
function safeSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80);
}

function comboDir(combo) {
  const hash = createHash("sha1").update(combo.key).digest("hex").slice(0, 8);
  return `${safeSegment(combo.provider)}__${safeSegment(combo.model)}__${safeSegment(combo.reasoningEffort ?? "default")}__${hash}`;
}

function newBatchId() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `mr-${stamp}-${randomUUID().slice(0, 4)}`;
}

function makeRun(batchId, combo, task, dataDir) {
  return {
    id: `${combo.key}::${task.id}`,
    comboKey: combo.key,
    provider: combo.provider,
    model: combo.model,
    reasoningEffort: combo.reasoningEffort ?? null,
    taskId: task.id,
    status: "pending",
    maxScore: task.maxScore,
    score: null,
    score100: null,
    sessionId: null,
    dir: `${comboDir(combo)}/${task.id}`,
    // Every run gets its own random temp root: sibling runs never share a
    // discoverable parent directory.
    root: path.join(os.tmpdir(), `mr-run-${randomUUID()}`),
    files: [],
    detail: {},
    usage: null,
    cost: null,
    judgeUsage: null,
    judgeCost: null,
    error: null,
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    attempts: [],
  };
}

function makeBatch({ id, selection, judge, dataDir }) {
  const runRoot = path.join(os.tmpdir(), "dsh-model-radar-runs", id);
  return {
    id,
    createdAt: now(),
    startedAt: now(),
    finishedAt: null,
    status: "running",
    judge,
    taskVersion: TASK_VERSION,
    rubricVersion: RUBRIC_VERSION,
    selection: selection.map((combo) => ({
      key: combo.key,
      provider: combo.provider,
      providerName: combo.providerName,
      model: combo.model,
      modelName: combo.modelName,
      reasoningEffort: combo.reasoningEffort ?? null,
      effortName: combo.effortName,
      supportsImage: combo.supportsImage === true,
      maxTokens: Number.isFinite(Number(combo.maxTokens)) && Number(combo.maxTokens) > 0 ? Number(combo.maxTokens) : null,
    })),
    workspace: {
      dir: path.join(dataDir, "runs", id),
      runRoot,
      mainSessionId: null,
    },
    runs: selection.flatMap((combo) => TASKS.map((task) => makeRun(id, combo, task, dataDir))),
    speedTests: [],
    combos: [],
    summary: null,
    progress: { done: 0, total: selection.length * TASKS.length, failed: 0, stopped: 0, interrupted: 0 },
    error: null,
    activeMs: 0,
    durationMs: null,
  };
}

/** Runs that still need work: everything except a finished task. */
export function unfinishedRuns(batch) {
  return (batch?.runs ?? []).filter((run) => run !== null && run !== undefined && run.status !== "done");
}

/**
 * Turn one unfinished run back into a clean pending run. The old session and
 * artifacts belong to the interrupted attempt and must not leak into the retry.
 */
export function resetRunForResume(run) {
  run.status = "pending";
  run.score = null;
  run.score100 = null;
  run.sessionId = null;
  run.files = [];
  run.detail = {};
  run.usage = null;
  run.cost = null;
  run.judgeUsage = null;
  run.judgeCost = null;
  run.error = null;
  run.startedAt = null;
  run.finishedAt = null;
  run.durationMs = null;
  run.root = path.join(os.tmpdir(), `mr-run-${randomUUID()}`);
  return run;
}

/**
 * Fold the just-finished attempt into the run's retry ledger before the run is
 * reset for a fresh-context retry. The ledger survives `resetRunForResume`, so
 * costs, tokens and durations from discarded attempts are not lost.
 *
 * `kind: "rerun"` marks a manual rerun of an already finished run; the client
 * uses it to keep those attempts out of the automatic-retry count.
 */
export function archiveRunAttempt(run, { kind = null } = {}) {
  const attempt = {
    n: (Array.isArray(run.attempts) ? run.attempts.length : 0) + 1,
    sessionId: run.sessionId ?? null,
    status: run.status ?? null,
    error: run.error ?? null,
    score: run.score ?? null,
    score100: run.score100 ?? null,
    durationMs: run.durationMs ?? null,
    finishedAt: run.finishedAt ?? null,
    usage: run.usage ?? null,
    cost: run.cost ?? null,
    judgeUsage: run.judgeUsage ?? null,
    judgeCost: run.judgeCost ?? null,
    isolation: run.detail?.isolation ?? null,
  };
  if (typeof kind === "string" && kind !== "") attempt.kind = kind;
  run.attempts = Array.isArray(run.attempts) ? run.attempts : [];
  run.attempts.push(attempt);

  if (run.cost !== null && typeof run.cost === "object") {
    run.retryCostUsd = (Number(run.retryCostUsd) || 0) + (Number(run.cost.usd) || 0);
    run.retryCostCny = (Number(run.retryCostCny) || 0) + (Number(run.cost.cny) || 0);
  }
  if (run.judgeCost !== null && typeof run.judgeCost === "object") {
    run.retryJudgeCostUsd = (Number(run.retryJudgeCostUsd) || 0) + (Number(run.judgeCost.usd) || 0);
  }
  if (run.usage !== null && typeof run.usage === "object") {
    const total = run.retryUsage ?? { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
    for (const key of ["inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"]) {
      total[key] = (Number(total[key]) || 0) + (Number(run.usage[key]) || 0);
    }
    run.retryUsage = total;
  }
  if (run.durationMs !== null && run.durationMs !== undefined) {
    run.retryDurationMs = (Number(run.retryDurationMs) || 0) + (Number(run.durationMs) || 0);
  }
  return run;
}

/**
 * Archive a settled run before a manual rerun. A previously `done` run keeps its
 * attempt in the ledger with `kind: "rerun"` and bumps `rerunCount`; every other
 * settled status just archives a normal retry attempt. Returns true when a done
 * run was rerun.
 */
export function archiveRunForRerun(run) {
  if (run === null || run === undefined) return false;
  if (run.status === "pending") return false;
  if (run.status === "done") {
    run.rerunCount = (Number(run.rerunCount) || 0) + 1;
    archiveRunAttempt(run, { kind: "rerun" });
    return true;
  }
  archiveRunAttempt(run);
  return false;
}

/**
 * A timeout, provider/turn error or judge failure means the run never produced
 * a usable answer, so it is safe to retry with a fresh context. A `done` run is
 * always final, even when its score is 0.
 */
export function shouldRetryRun(run, { stopped = false, timedOut = false } = {}) {
  if (stopped || timedOut) return false;
  return run?.status === "timeout" || run?.status === "error" || run?.status === "judge_error";
}

/**
 * Strip everything a running batch must not expose over HTTP: per-run answers,
 * grades, scores, artifacts, session ids and the live judge digest. The progress
 * UI only needs statuses, so a local process cannot read other candidates'
 * outputs through the plugin routes while the batch is still running.
 */
export function stripLiveBatch(batch) {
  if (batch === null || batch === undefined) return batch;
  const copy = clone(batch);
  copy.combos = [];
  copy.summary = null;
  for (const run of Array.isArray(copy.runs) ? copy.runs : []) {
    const keep = {
      id: run.id,
      comboKey: run.comboKey,
      provider: run.provider,
      model: run.model,
      reasoningEffort: run.reasoningEffort ?? null,
      taskId: run.taskId,
      status: run.status,
      maxScore: run.maxScore,
      startedAt: run.startedAt ?? null,
      finishedAt: run.finishedAt ?? null,
      durationMs: run.durationMs ?? null,
    };
    for (const key of Object.keys(run)) delete run[key];
    Object.assign(run, keep);
  }
  return copy;
}

/** A batch is resumable when it is not running and still has unfinished runs. */
export function canResumeBatch(batch) {
  if (batch === null || batch === undefined) return false;
  if (batch.status === "running") return false;
  // Scoring protocol changed -> resuming would mix v1 and v2 semantics.
  if (batch.taskVersion !== TASK_VERSION || batch.rubricVersion !== RUBRIC_VERSION) return false;
  return unfinishedRuns(batch).length > 0;
}

/**
 * A settled batch of this build can rerun any selection of its runs, including
 * runs that are already done (the rerun dialog's "重跑已完成项").
 */
export function canRerunBatch(batch) {
  if (batch === null || batch === undefined) return false;
  if (batch.status === "running") return false;
  if (batch.taskVersion !== TASK_VERSION || batch.rubricVersion !== RUBRIC_VERSION) return false;
  return true;
}

function nonEmptyStrings(list) {
  return Array.isArray(list) ? list.filter((entry) => typeof entry === "string" && entry !== "") : [];
}

/**
 * Resolve and reset the runs one `POST /resume` call must rerun.
 *
 * - `runIds` wins when present (existing single-run retry);
 * - otherwise `comboKeys` × `taskIds` select the intersection of matching
 *   combos and tasks (the rerun dialog's matrix selection);
 * - with no explicit selection every unfinished run is rerun, as before.
 *
 * Settled attempts are archived first (a done run records `kind: "rerun"` and
 * bumps `rerunCount`), then reset for a fresh context. Throws an Error with a
 * `code` when the selection is empty or unknown.
 */
export function prepareResumeRuns(batch, options = {}) {
  const runIds = nonEmptyStrings(options?.runIds);
  const comboKeys = Array.isArray(options?.comboKeys) ? options.comboKeys : null;
  const taskIds = Array.isArray(options?.taskIds) ? options.taskIds : null;
  let selected;
  if (runIds.length > 0) {
    const wanted = new Set(runIds);
    selected = (batch?.runs ?? []).filter((run) => wanted.has(run.id) || wanted.has(`${run.comboKey}::${run.taskId}`));
    if (selected.length === 0) {
      const error = new Error("none of the requested runs exist in this batch");
      error.code = "not-found";
      throw error;
    }
  } else if (comboKeys !== null || taskIds !== null) {
    const knownCombos = new Set(
      (Array.isArray(batch?.selection) ? batch.selection : [])
        .map((entry) => entry?.key)
        .filter((key) => typeof key === "string"),
    );
    const knownTasks = new Set(TASKS.map((task) => task.id));
    const comboFilter =
      comboKeys === null ? null : new Set(nonEmptyStrings(comboKeys).filter((key) => knownCombos.has(key)));
    const taskFilter = taskIds === null ? null : new Set(nonEmptyStrings(taskIds).filter((id) => knownTasks.has(id)));
    selected = (batch?.runs ?? []).filter(
      (run) => (comboFilter === null || comboFilter.has(run.comboKey)) && (taskFilter === null || taskFilter.has(run.taskId)),
    );
    if (selected.length === 0) {
      const error = new Error("the rerun selection does not match any run in this batch");
      error.code = "empty-selection";
      throw error;
    }
  } else {
    selected = unfinishedRuns(batch);
    if (selected.length === 0) {
      const error = new Error("this batch has no unfinished runs");
      error.code = "nothing-to-resume";
      throw error;
    }
  }
  let rerun = false;
  for (const run of selected) {
    if (archiveRunForRerun(run)) rerun = true;
    resetRunForResume(run);
  }
  return { runs: selected, remaining: selected.length, rerun };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class Runner {
  constructor({ ctx, config, store, ready, presetReady, resolveModelLimit }) {
    this.ctx = ctx;
    this.config = config;
    this.store = store;
    this.ready = ready;
    this.resolveModelLimit = typeof resolveModelLimit === "function" ? resolveModelLimit : async () => null;
    this.presetReady = presetReady ?? Promise.resolve({ ok: false, error: "presets were not registered" });
    this.active = null;
    this.lastBatchId = null;
    this.disposed = false;
    this.wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  }

  #agents() {
    return this.ctx.get("agents");
  }

  /** Read a model's output budget from the live DSH catalog (null if unknown). */
  async #modelMaxTokens(provider, model) {
    if (typeof provider !== "string" || typeof model !== "string") return null;
    try {
      const limit = await this.resolveModelLimit(provider, model);
      const value = Number(limit);
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  current() {
    return this.active === null ? null : { batchId: this.active.batch.id, status: this.active.batch.status };
  }

  async status(batchId) {
    await this.ready;
    if (this.active !== null && ((batchId === undefined || batchId === null) || this.active.batch.id === batchId)) {
      return {
        running: true,
        resumable: false,
        rerunnable: false,
        batch: {
          ...stripLiveBatch(compactBatch(clone(this.active.batch))),
          resumable: false,
          rerunnable: false,
        },
        elapsedMs: (Number(this.active.batch.activeMs) || 0) + (now() - this.active.segmentStart),
      };
    }
    const id = batchId ?? this.lastBatchId ?? this.store.listBatches()[0]?.id;
    if (id === undefined || id === null) return { running: false, resumable: false, rerunnable: false, batch: null };
    const batch = await this.store.getBatch(id);
    // While another batch runs, a settled batch must still be sanitized: its
    // answers and scores are readable over localhost from candidate bash.
    const readOnly = this.active !== null;
    const payload = readOnly && batch !== null ? stripLiveBatch(batch) : batch;
    const resumable = !readOnly && canResumeBatch(batch);
    const rerunnable = canRerunBatch(batch);
    return {
      running: false,
      resumable,
      rerunnable,
      // The detail drawer may open this batch directly; keep the flag on it too.
      batch: payload === null ? null : { ...payload, resumable, rerunnable },
    };
  }

  async start({ selection, judge }) {
    await this.ready;
    if (this.active !== null) {
      const error = new Error("an evaluation batch is already running");
      error.code = "busy";
      throw error;
    }
    if (this.disposed) {
      const error = new Error("runner is disposed");
      error.code = "disposed";
      throw error;
    }
    const agents = this.#agents();
    if (agents === undefined) {
      const error = new Error("agent service is unavailable");
      error.code = "no-agents";
      throw error;
    }
    const presetState = await this.presetReady;
    if (presetState.ok !== true) {
      const error = new Error(`benchmark presets are unavailable: ${presetState.error}`);
      error.code = "preset-unavailable";
      throw error;
    }
    // Fill output budgets from the live model catalog at run start so a model
    // setting change (e.g. 64k -> 128k) is picked up without code changes.
    const resolvedSelection = [];
    for (const combo of selection) {
      const maxTokens =
        Number.isFinite(Number(combo.maxTokens)) && Number(combo.maxTokens) > 0
          ? Number(combo.maxTokens)
          : await this.#modelMaxTokens(combo.provider, combo.model);
      resolvedSelection.push({ ...combo, maxTokens: maxTokens ?? null });
    }
    const judgeMaxTokens =
      Number.isFinite(Number(judge.maxTokens)) && Number(judge.maxTokens) > 0
        ? Number(judge.maxTokens)
        : await this.#modelMaxTokens(judge.provider, judge.model);
    const id = newBatchId();
    const batch = makeBatch({
      id,
      selection: resolvedSelection,
      judge: { ...judge, maxTokens: judgeMaxTokens ?? null },
      dataDir: this.store.dataDir,
    });
    await mkdir(batch.workspace.dir, { recursive: true });
    await mkdir(batch.workspace.runRoot, { recursive: true });
    const active = {
      batch,
      controller: new AbortController(),
      handles: new Set(),
      stopped: false,
      reason: null,
      timedOut: false,
      startedAt: now(),
      segmentStart: now(),
      mainHandle: null,
      injected: 0,
      briefs: [],
      toolDebug: [],
      resumed: false,
    };
    this.active = active;
    await this.store.createBatch(batch);
    this.#run(active).catch(() => undefined);
    return clone(batch);
  }

  /**
   * Continue a batch that was stopped, interrupted or partially failed: keep
   * every finished run, reset the rest, then let the normal orchestration finish
   * the remaining tasks and write a fresh summary. A targeted selection may also
   * rerun runs that are already done (see `prepareResumeRuns`).
   */
  async resume(batchId, options = {}) {
    await this.ready;
    if (this.active !== null) {
      const error = new Error("an evaluation batch is already running");
      error.code = "busy";
      throw error;
    }
    if (this.disposed) {
      const error = new Error("runner is disposed");
      error.code = "disposed";
      throw error;
    }
    const agents = this.#agents();
    if (agents === undefined) {
      const error = new Error("agent service is unavailable");
      error.code = "no-agents";
      throw error;
    }
    const presetState = await this.presetReady;
    if (presetState.ok !== true) {
      const error = new Error(`benchmark presets are unavailable: ${presetState.error}`);
      error.code = "preset-unavailable";
      throw error;
    }
    if (typeof batchId !== "string" || batchId === "") {
      const error = new Error("batchId is required");
      error.code = "batch";
      throw error;
    }
    const batch = await this.store.getBatch(batchId);
    if (batch === null || batch === undefined) {
      const error = new Error(`unknown batch: ${batchId}`);
      error.code = "not-found";
      throw error;
    }
    if (batch.status === "running") {
      const error = new Error("an evaluation batch is already running");
      error.code = "busy";
      throw error;
    }
    if (batch.taskVersion !== TASK_VERSION || batch.rubricVersion !== RUBRIC_VERSION) {
      const error = new Error(
        `batch versions do not match this build: ${batch.taskVersion}/${batch.rubricVersion} vs ${TASK_VERSION}/${RUBRIC_VERSION}`,
      );
      error.code = "version-mismatch";
      throw error;
    }
    // `runIds` reruns exactly those runs; `comboKeys`/`taskIds` resolve the
    // rerun dialog's matrix selection into run ids; without any selection a
    // resume picks up every unfinished run as before.
    const prepared = prepareResumeRuns(batch, {
      runIds: options?.runIds,
      comboKeys: options?.comboKeys,
      taskIds: options?.taskIds,
    });
    // Old batches may not carry maxTokens; read them from the live catalog.
    for (const combo of batch.selection ?? []) {
      if (!(Number.isFinite(Number(combo.maxTokens)) && Number(combo.maxTokens) > 0)) {
        const limit = await this.#modelMaxTokens(combo.provider, combo.model);
        if (limit !== null) combo.maxTokens = limit;
      }
    }
    if (!(Number.isFinite(Number(batch.judge?.maxTokens)) && Number(batch.judge.maxTokens) > 0)) {
      const limit = await this.#modelMaxTokens(batch.judge?.provider, batch.judge?.model);
      batch.judge = { ...batch.judge, maxTokens: limit };
    }
    const active = {
      batch,
      controller: new AbortController(),
      handles: new Set(),
      stopped: false,
      reason: null,
      timedOut: false,
      startedAt: now(),
      segmentStart: now(),
      mainHandle: null,
      injected: 0,
      briefs: [],
      toolDebug: [],
      resumed: true,
    };
    // Old batches only carry durationMs; keep their active time when resuming.
    if (!Number.isFinite(Number(batch.activeMs))) batch.activeMs = Number(batch.durationMs) || 0;
    batch.status = "running";
    batch.finishedAt = null;
    batch.durationMs = null;
    batch.error = null;
    batch.summary = null;
    batch.resumedAt = now();
    batch.resumeCount = (Number(batch.resumeCount) || 0) + 1;
    batch.workspace = batch.workspace ?? {};
    batch.workspace.dir = batch.workspace.dir ?? path.join(this.store.dataDir, "runs", batch.id);
    batch.workspace.runRoot = batch.workspace.runRoot ?? path.join(os.tmpdir(), "dsh-model-radar-runs", batch.id);
    batch.workspace.mainSessionId = null;
    this.#updateProgress(batch);
    await mkdir(batch.workspace.dir, { recursive: true });
    await mkdir(batch.workspace.runRoot, { recursive: true });
    this.active = active;
    await this.store.persistBatch(batch);
    this.#run(active).catch(() => undefined);
    return { batch: clone(batch), remaining: prepared.remaining, rerun: prepared.rerun };
  }

  async stop(batchId) {
    await this.ready;
    const active = this.active;
    if (active === null) return false;
    if (batchId !== undefined && batchId !== null && batchId !== active.batch.id) return false;
    active.stopped = true;
    active.reason = active.reason ?? "user";
    try {
      active.controller.abort();
    } catch {
      // Abort is idempotent.
    }
    for (const handle of [...active.handles]) {
      try {
        await handle.agent.cancel({ kind: "user" });
      } catch {
        // A handle may already have settled.
      }
    }
    return true;
  }

  dispose() {
    this.disposed = true;
    const active = this.active;
    if (active !== null) {
      const wasRunning = active.batch !== null && active.batch !== undefined && active.batch.status === "running";
      // An explicit stop or timeout already owns the outcome; a reload must not
      // relabel that batch as "interrupted by the plugin".
      if (active.reason === null && wasRunning) active.reason = INTERRUPT_REASON;
      active.stopped = true;
      const batch = active.batch;
      // Persist the reason synchronously so a batch is never left looking
      // "stopped for no reason" after a plugin reload or app quit.
      if (wasRunning && active.reason === INTERRUPT_REASON) {
        batch.status = "interrupted";
        batch.error = { code: INTERRUPT_REASON, message: INTERRUPT_MESSAGE };
        batch.interruptedAt = now();
        this.store.schedulePersist(batch, 0);
      }
      try {
        active.controller.abort();
      } catch {
        // Ignore.
      }
    }
  }

  #stopRunStatus(active) {
    return active.reason === INTERRUPT_REASON ? "interrupted" : "stopped";
  }

  // ── batch orchestration ────────────────────────────────────────────────

  async #run(active) {
    const batch = active.batch;
    const timer = setTimeout(() => {
      active.timedOut = true;
      active.stopped = true;
      active.reason = "batch-timeout";
      try {
        active.controller.abort();
      } catch {
        // Ignore.
      }
      for (const handle of [...active.handles]) cancelAgentQuietly(handle);
    }, this.config.perBatchTimeoutMs);
    timer.unref?.();
    try {
      active.mainHandle = await this.#createMainAgent(active);
      batch.workspace.mainSessionId = active.mainHandle.agent.id;
      this.store.schedulePersist(batch);
      await this.#runSpeedTests(active);
      await this.#runLanes(active);
      if (!active.stopped && this.#hasAnyScore(batch)) {
        this.#buildCombos(batch);
        await this.#summarize(active);
      }
      if (!active.stopped && active.reason === null) {
        batch.status = this.#overallStatus(batch);
      }
    } catch (error) {
      // A plugin reload already recorded the interrupt; never overwrite it with
      // the abort error that the reload itself caused.
      if (active.reason !== INTERRUPT_REASON) {
        batch.error = {
          code: error?.code ?? "internal",
          message: error instanceof Error ? error.message : String(error),
        };
        if (batch.status === "running") batch.status = "error";
      }
    } finally {
      clearTimeout(timer);
      await this.#finalize(active).catch(() => undefined);
    }
  }

  #hasAnyScore(batch) {
    return batch.runs.some((run) => run.status === "done");
  }

  #overallStatus(batch) {
    const runs = batch.runs;
    if (runs.length === 0) return "error";
    if (runs.every((run) => run.status === "done")) return "done";
    if (runs.some((run) => run.status === "done")) return "partial";
    return "error";
  }

  async #createMainAgent(active) {
    const agents = this.#agents();
    const judge = active.batch.judge;
    const sessionId = randomUUID();
    const options = {
      sessionId,
      meta: { cwd: active.batch.workspace.dir },
      agentOptions: { provider: judge.provider, model: judge.model },
      setup: async (agentCtx, agent) => {
        await this.#mountPreset(agentCtx, this.config.judgePreset, active.toolDebug);
        this.#restrictTools(agentCtx, new Set(), active.toolDebug, agent);
      },
    };
    if (judge.reasoningEffort) options.agentOptions.reasoningEffort = judge.reasoningEffort;
    const handle = await agents.create(options);
    active.handles.add(handle);
    try {
      const title = `[模型雷达] 裁判 · ${judge.model} · ${active.batch.id}`;
      this.ctx.get("sessionTitle")?.rename(handle.agent.session, title);
    } catch {
      // Titles are cosmetic; sessionId remains the source of truth.
    }
    return handle;
  }

  async #createChild(active, combo, task, runDir, preset = null, rootChild = false) {
    const agents = this.#agents();
    const sessionId = randomUUID();
    const options = {
      sessionId,
      // No `parentAgent`: each candidate session is a root session, so no
      // parent history, plan or brief can ever be seeded into it.
      meta: {
        cwd: runDir,
        origin: rootChild ? "root" : "subagent",
        delegationDepth: 1,
      },
      agentOptions: { provider: combo.provider, model: combo.model },
      setup: async (agentCtx, agent) => {
        await this.#mountPreset(agentCtx, preset ?? this.config.benchPreset, active.toolDebug);
        this.#restrictTools(agentCtx, CHILD_TOOLS, active.toolDebug, agent, runDir);
      },
      signal: active.controller.signal,
    };
    if (combo.reasoningEffort) options.agentOptions.reasoningEffort = combo.reasoningEffort;
    // Honor the catalog's per-model output budget (e.g. 128k) instead of
    // relying on whatever the provider's route default happens to be.
    let comboMaxTokens = Number(combo.maxTokens);
    if (!(Number.isFinite(comboMaxTokens) && comboMaxTokens > 0)) {
      comboMaxTokens = await this.#modelMaxTokens(combo.provider, combo.model);
      if (comboMaxTokens !== null) combo.maxTokens = comboMaxTokens;
    }
    if (Number.isFinite(comboMaxTokens) && comboMaxTokens > 0) {
      options.agentOptions.maxTokens = Number(comboMaxTokens);
    }
    const handle = await agents.create(options);
    active.handles.add(handle);
    try {
      const title = `[模型雷达] ${combo.model} · ${combo.effortName ?? "默认"} · ${task.id}`;
      this.ctx.get("sessionTitle")?.rename(handle.agent.session, title);
    } catch {
      // Title is cosmetic.
    }
    return handle;
  }

  async #mountPreset(agentCtx, presetId, sink) {
    const state = await this.presetReady;
    if (state.ok !== true) throw new Error(`benchmark presets are unavailable: ${state.error}`);
    const presets = this.ctx.get("agentPresets");
    if (presets === undefined) throw new Error("agentPresets service is unavailable");
    await presets.mount(agentCtx, presetId);
    sink?.push(`mounted:${presetId}`);
  }

  #restrictTools(agentCtx, allowed, sink, agent, runDir) {
    try {
      const tools = agentCtx.get("tools");
      if (tools === undefined) {
        sink?.push("no-tools-service");
        return;
      }
      const names = (agent === undefined ? tools.definitions() : tools.definitions(agent)).map(
        (definition) => definition.name,
      );
      sink?.push(`visible:${names.join(",")}`);
      const deny = names.filter((name) => !allowed.has(name));
      if (deny.length > 0) {
        try {
          agentCtx.tools.restrict({ deny });
          sink?.push(`denied:${deny.join(",")}`);
        } catch (error) {
          sink?.push(`restrict-error:${error instanceof Error ? error.message : String(error)}`);
        }
      }
      agentCtx.tools.guard((execution) => {
        if (!allowed.has(execution.name)) return `tool ${execution.name} is not part of this benchmark run`;
        // Best-effort isolation: candidate runs must stay inside their own
        // working directory and must not inspect the harness store or other
        // batches. This is a guardrail, not an OS sandbox.
        let args = execution.arguments ?? {};
        if (typeof args === "string") {
          try {
            args = JSON.parse(args);
          } catch {
            return "unreadable tool arguments";
          }
        }
        if (args === null || typeof args !== "object") args = {};
        if (execution.name === "bash") {
          const command = String(args.command ?? "");
          if (commandEscapesWorkspace(command, runDir)) {
            return "access outside the run workspace is not allowed";
          }
        } else {
          const target = String(args.file_path ?? args.path ?? args.pattern ?? "");
          if (target.includes("..")) return "parent-directory access is not allowed in benchmark runs";
          if (toolPathEscapesWorkspace(runDir, target)) {
            return "access outside the run workspace is not allowed";
          }
        }
        return undefined;
      });
      sink?.push("guarded");
    } catch (error) {
      sink?.push(`restrict-error:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Development-only probe: create the judge session and one restricted child
   * exactly like a real run, then return the child's answer, events and tools.
   * Used to validate the agent API contract without spending a full batch.
   */
  /** Resolve one delivered artifact for the read-only preview route. */
  async artifactPath({ batchId, runId, file }) {
    await this.ready;
    const batch = await this.store.getBatch(batchId);
    if (batch === null || batch === undefined) return null;
    const run = (batch.runs ?? []).find(
      (entry) => entry.id === runId || `${entry.comboKey}::${entry.taskId}` === runId,
    );
    if (run === undefined) return null;
    const name = path.basename(String(file ?? ""));
    if (name === "" || name === "." || name === "..") return null;
    const allowed = new Set((run.files ?? []).map((entry) => entry.name));
    if (!allowed.has(name)) return null;
    const bases = [];
    if (typeof run.detail?.artifactDir === "string") {
      bases.push(path.join(this.store.dataDir, run.detail.artifactDir));
    }
    if (batch.workspace?.runRoot) bases.push(path.join(batch.workspace.runRoot, run.dir));
    bases.push(path.join(this.store.dataDir, run.dir));
    for (const base of bases) {
      const candidate = path.join(base, name);
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }

  async #runLanes(active) {
    const lanes = new Map();
    for (const combo of active.batch.selection) {
      const key = `${combo.provider}\u0000${combo.model}`;
      if (!lanes.has(key)) lanes.set(key, []);
      lanes.get(key).push(combo);
    }
    const queues = [...lanes.values()];
    let cursor = 0;
    const limit = Math.max(1, Math.min(this.config.maxParallelModels, queues.length));
    const workers = Array.from({ length: limit }, async () => {
      while (!active.stopped) {
        const lane = queues[cursor];
        cursor += 1;
        if (lane === undefined) return;
        await this.#runLane(active, lane);
      }
    });
    await Promise.all(workers);
    if (active.stopped) {
      const status = this.#stopRunStatus(active);
      for (const run of active.batch.runs) {
        if (run.status === "pending") run.status = status;
      }
    }
  }

  async #runLane(active, combos) {
    for (const combo of combos) {
      if (active.stopped) return;
      for (const task of TASKS) {
        if (active.stopped) return;
        const run = active.batch.runs.find((entry) => entry.comboKey === combo.key && entry.taskId === task.id);
        if (run === undefined) continue;
        // A targeted resume leaves the other failures untouched; only pending
        // runs belong to this execution pass.
        if (run.status !== "pending") continue;
        await this.#runOne(active, combo, task, run);
      }
    }
  }

  async #runOne(active, combo, task, run) {
    const maxAttempts = 1 + Math.max(0, Number(this.config.autoRetries) || 0);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (active.stopped) break;
      const outcome = await this.#runAttempt(active, combo, task, run);
      if (outcome !== "retry") break;
      // Keep the failed final attempt as the run's outcome; only discarded
      // attempts go into the retry ledger.
      if (attempt >= maxAttempts) break;
      if (active.stopped) break;
      // A judge failure is on the judge side: retry judging the artifact we
      // already have before spending another full candidate run. The candidate's
      // session is untouched; only the judge call is repeated with a fresh one.
      if (run.status === "judge_error" && (task.id === "qin" || task.id === "pelican")) {
        run.judgeRetries = (Number(run.judgeRetries) || 0) + 1;
        run.status = "running";
        await this.#grade(active, combo, task, run);
        this.store.schedulePersist(active.batch);
        if (run.status === "done") break;
      }
      // A timeout / provider failure / judge failure is not a model answer.
      // Retry with a brand-new session so the candidate starts from a clean
      // context; costs and durations from the discarded attempt are kept.
      archiveRunAttempt(run);
      resetRunForResume(run);
      this.store.schedulePersist(active.batch);
    }
    this.#injectBrief(active, combo, task, run);
  }

  async #runAttempt(active, combo, task, run) {
    const runDir = run.root ?? path.join(active.batch.workspace.runRoot, run.dir);
    run.status = "running";
    run.startedAt = now();
    this.store.schedulePersist(active.batch);
    let handle = null;
    let clearNudges = () => {};
    try {
      await prepareRunDir(task.id, runDir);
      handle = await this.#createChild(active, combo, task, runDir);
      run.sessionId = handle.agent.id;
      // The pi-ai adapter rejects images carried in the initial user history for
      // these routes, so the Pompeii image is read by the candidate through the
      // `read_image` tool from its own working directory instead.
      const content = [{ type: "text", text: withToolPolicy(buildPrompt(task.id)) }];
      handle.agent.followup({ content, source: { kind: "user" } });
      clearNudges = this.#scheduleNudges(handle.agent, task.id, runDir);
      const outcome = await this.#waitForIdle(active, handle.agent, this.config.perTaskTimeoutMs);
      if (outcome === "timeout") {
        run.status = "timeout";
        run.error = { code: "timeout", message: `task exceeded ${this.config.perTaskTimeoutMs}ms` };
        try {
          await handle.agent.cancel({ kind: "user" });
        } catch {
          // Already settled.
        }
        await this.#waitForIdle(active, handle.agent, 15_000).catch(() => undefined);
      } else if (active.stopped) {
        const status = this.#stopRunStatus(active);
        run.status = status;
        run.error = { code: status, message: active.reason ?? "stopped" };
      }

      let events = await this.#readEvents(handle, run.sessionId);
      // A provider can spend the whole output budget inside one reasoning block
      // and end the turn with `max-tokens` before it calls any tool. Give the
      // run exactly one continuation instead of recording an empty result.
      if (run.status === "running" && turnCutByMaxTokens(events) && run.detail.maxTokensRetry !== true) {
        run.detail.maxTokensRetry = true;
        const artifact =
          task.id === "qin" ? "result.svg" : task.id === "pelican" ? "index.html" : task.id === "pompeii" ? "model_answer.json" : null;
        const retryText = artifact === null
          ? "上一条回答把全部输出预算用在推理上并被截断。请立即给出最终答案（格式：最终答案：<数字>），不要再展开分析。"
          : `上一条回答把全部输出预算用在推理上并被截断，${artifact} 还没有写入。请立即用工具完成并写入 ${artifact}，控制推理长度，不要重复分析。`;
        try {
          handle.agent.followup({ content: [{ type: "text", text: retryText }], source: { kind: "user" } });
        } catch {
          // A settled agent needs no continuation.
        }
        const retryOutcome = await this.#waitForIdle(active, handle.agent, this.config.perTaskTimeoutMs);
        if (retryOutcome === "timeout") {
          run.status = "timeout";
          run.error = { code: "timeout", message: `task exceeded ${this.config.perTaskTimeoutMs}ms` };
          try {
            await handle.agent.cancel({ kind: "user" });
          } catch {
            // Already settled.
          }
          await this.#waitForIdle(active, handle.agent, 15_000).catch(() => undefined);
        } else if (active.stopped) {
          const status = this.#stopRunStatus(active);
          run.status = status;
          run.error = { code: status, message: active.reason ?? "stopped" };
        }
        events = await this.#readEvents(handle, run.sessionId);
      }
      attachIsolationAudit(run, events, runDir);
      const finalText = lastAssistantText(events);
      run.detail.finalText = finalText.slice(0, 12_000);
      run.usage = foldUsage(events);
      run.cost = priceUsage(this.config.pricing, {
        model: combo.model,
        usage: run.usage,
        at: run.startedAt,
      });

      if (run.status === "running") {
        const turn = turnOutcome(events);
        if (turn !== null && turn.kind === "error") {
          run.status = "error";
          run.error = {
            code: turn.error?.code ?? "turn-error",
            message: turn.error?.message ?? "model request failed",
          };
        } else if (turn !== null && turn.kind === "aborted") {
          run.status = active.stopped ? this.#stopRunStatus(active) : "error";
          run.error = { code: "aborted", message: "turn aborted" };
        }
      }

      const artifacts = await collectRunArtifacts(task.id, runDir);
      run.files = artifacts.files;
      Object.assign(run.detail, artifacts.detail);
      await this.#archiveArtifacts(active.batch, run, runDir).catch(() => undefined);

      if (run.status === "running") {
        await this.#grade(active, combo, task, run);
      }
    } catch (error) {
      run.status = "error";
      run.error = {
        code: error?.code ?? "internal",
        message: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearNudges();
      run.finishedAt = now();
      run.durationMs = run.finishedAt - (run.startedAt ?? run.finishedAt);
      if (handle !== null) {
        active.handles.delete(handle);
        await this.#archiveAndDispose(handle).catch(() => undefined);
      }
      this.#updateProgress(active.batch);
      this.store.schedulePersist(active.batch);
    }
    // Timeout, provider/turn error and judge failure are infrastructure
    // outcomes, not scores; the orchestrator may retry this run once.
    return shouldRetryRun(run, { stopped: active.stopped, timedOut: active.timedOut }) ? "retry" : "final";
  }

  /**
   * Soft time budgets: the same nudges for every model, so an agent spends its
   * remaining time converging on an artifact instead of exploring.
   */
  #scheduleNudges(agent, taskId, runDir) {
    const timeout = this.config.perTaskTimeoutMs;
    const artifact =
      taskId === "qin" ? "result.svg" : taskId === "pelican" ? "index.html" : taskId === "pompeii" ? "model_answer.json" : null;
    const messages = [
      [Math.floor(timeout * 0.6), artifact === null
        ? "时间预算已用 60%。请开始收敛，尽快给出最终答案（格式：最终答案：<数字>）。"
        : `时间预算已用 60%。请开始收敛：先确保 ${artifact} 已写入当前工作目录，再继续改进。`],
      [Math.floor(timeout * 0.85), artifact === null
        ? "时间预算即将耗尽。请立即给出最终答案（格式：最终答案：<数字>）并结束回合。"
        : `时间预算即将耗尽。请立即把当前最有把握的版本写入 ${artifact}，然后结束回合。`],
    ];
    const timers = messages.map(([delay, text]) =>
      setTimeout(() => {
        try {
          agent.steer({ content: [{ type: "text", text }], source: { kind: "user" } });
        } catch {
          // A settled agent needs no nudge.
        }
      }, delay),
    );
    for (const timer of timers) timer.unref?.();
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }

  #updateProgress(batch) {
    const runs = batch.runs;
    batch.progress = {
      done: runs.filter((run) => run.status === "done").length,
      failed: runs.filter((run) => ["error", "timeout", "judge_error"].includes(run.status)).length,
      stopped: runs.filter((run) => run.status === "stopped").length,
      interrupted: runs.filter((run) => run.status === "interrupted").length,
      total: runs.length,
    };
  }

  /** Keep delivered artifacts in the durable store; the working dir stays in tmp. */
  async #archiveArtifacts(batch, run, runDir) {
    if (run.files.length === 0) return;
    const relative = path.join("runs", batch.id, run.dir);
    const target = path.join(this.store.dataDir, relative);
    await mkdir(target, { recursive: true });
    for (const file of run.files) {
      await copyFile(path.join(runDir, file.name), path.join(target, file.name)).catch(() => undefined);
    }
    run.detail.artifactDir = relative;
  }

  async #grade(active, combo, task, run) {
    if (task.id === "candy") {
      const result = scoreCandy(run.detail.finalText ?? "");
      run.score = result.score;
      run.score100 = result.score100;
      run.detail.grade = result;
      run.detail.answerText = result.answer === null ? "" : String(result.answer);
      run.status = "done";
      return;
    }
    if (task.id === "pompeii") {
      const gold = await pompeiiGold();
      const raw = run.detail.answerText ?? "";
      if (raw.trim() === "") {
        run.detail.grade = { missing: true, formatError: "model_answer.json missing" };
        run.score = null;
        run.score100 = null;
        run.status = "error";
        run.error = { code: "no-artifact", message: "model_answer.json missing" };
      } else {
        const result = scorePompeii(raw, gold.edges);
        run.detail.grade = { ...result, weighted: result.score };
        run.score = result.score;
        run.score100 = result.score100;
      }
      if (run.status !== "error") run.status = "done";
      return;
    }
    const artifactText = task.id === "qin" ? run.detail.svgText : run.detail.htmlText;
    if (!artifactText) {
      run.detail.grade = { missing: true };
      run.score = null;
      run.score100 = null;
      run.status = "error";
      run.error = { code: "no-artifact", message: task.id === "qin" ? "result.svg missing" : "index.html missing" };
      return;
    }
    const judged = await judgeTask(this.ctx, {
      judge: active.batch.judge,
      taskId: task.id,
      rubric: judgeRubric(task.id),
      prompt: buildPrompt(task.id),
      finalText: run.detail.finalText ?? "",
      artifactText,
      artifactLabel: task.id === "qin" ? "result.svg" : "index.html",
      maxScore: 100,
      maxTokens: (() => {
        const value = Number(active.batch.judge?.maxTokens);
        return Number.isFinite(value) && value > 0 ? value : undefined;
      })(),
      maxAttempts: this.config.judgeMaxAttempts,
      signal: active.controller.signal,
      wait: this.wait,
    });
    run.judgeUsage = judged.usage;
    run.judgeCost = priceUsage(this.config.pricing, {
      model: active.batch.judge.model,
      usage: judged.usage,
      at: run.startedAt,
    });
    run.detail.judge = {
      ok: judged.ok,
      reason: judged.reason,
      breakdown: judged.breakdown,
      attempts: judged.attempts,
      error: judged.error,
    };
    const graded = judged.ok ? gradeJudgeResult(task.id, judged) : null;
    if (graded !== null) {
      run.score100 = graded.score100;
      run.score = graded.score;
      run.detail.grade = graded.grade;
      run.status = "done";
    } else if (active.stopped) {
      const status = this.#stopRunStatus(active);
      run.score = null;
      run.score100 = null;
      run.status = status;
      run.error = { code: status, message: active.reason ?? "stopped" };
    } else {
      run.score = null;
      run.score100 = null;
      run.status = "judge_error";
      run.error = { code: "judge_error", message: judged.error ?? "judge failed" };
    }
  }

  async #waitForIdle(active, agent, timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        active.controller.signal.removeEventListener("abort", abort);
        resolve(value);
      };
      const timer = setTimeout(() => finish("timeout"), timeoutMs);
      timer.unref?.();
      const abort = () => finish("aborted");
      if (active.controller.signal.aborted) {
        finish("aborted");
        return;
      }
      active.controller.signal.addEventListener("abort", abort, { once: true });
      Promise.resolve(agent.whenIdle())
        .then(() => finish(active.stopped ? "aborted" : "idle"))
        .catch(() => finish("error"));
    });
  }

  async #readEvents(handle, sessionId) {
    // The live session surface is synchronous and includes the turn that just
    // settled; the persisted query is only a fallback (it can lag a flush).
    try {
      const events = handle.agent.session?.ownEvents?.();
      if (Array.isArray(events) && events.some((event) => event?.type === "assistant/message")) return events;
    } catch {
      // Fall through to the persisted query.
    }
    try {
      const query = this.ctx.get("sessionQuery");
      if (query !== undefined) {
        const snapshot = await query.readSession(sessionId);
        if (snapshot !== null && Array.isArray(snapshot.events)) return snapshot.events;
      }
    } catch {
      // Ignore and return what the live surface offered.
    }
    try {
      return handle.agent.session?.ownEvents?.() ?? [];
    } catch {
      return [];
    }
  }

  async #archiveAndDispose(handle) {
    try {
      this.ctx.get("workspaceRegistry")?.archiveSession(handle.agent.id);
    } catch {
      // Archiving is best-effort.
    }
    try {
      await handle.dispose();
    } catch {
      // Dispose is idempotent.
    }
  }

  #injectBrief(active, combo, task, run) {
    const score = run.score === null ? "—" : `${run.score}/${task.maxScore}`;
    const parts = [
      `[模型雷达] ${combo.provider}/${combo.model} · ${combo.effortName ?? "默认"} · ${task.id}`,
      `状态 ${run.status} · 得分 ${score}`,
    ];
    if (run.detail.grade?.formatError) parts.push(`格式问题：${run.detail.grade.formatError}`);
    if (run.detail.judge?.reason) parts.push(`裁判：${run.detail.judge.reason}`);
    if (run.error) parts.push(`错误：${run.error.code} ${run.error.message}`);
    if (Array.isArray(run.attempts)) {
      // Manual reruns are listed separately from fresh-context automatic retries.
      const retries = run.attempts.filter((attempt) => attempt?.kind !== "rerun").length;
      if (retries > 0) parts.push(`自动重试 ${retries} 次（新上下文）`);
    }
    const text = parts.join("\n").slice(0, 900);
    active.briefs.push(text);
  }

  // ── speed tests ────────────────────────────────────────────────────────

  async #runSpeedTests(active) {
    const previous = Array.isArray(active.batch.speedTests) ? active.batch.speedTests : [];
    const byKey = new Map(
      previous.filter((record) => record !== null && typeof record.comboKey === "string").map((record) => [record.comboKey, record]),
    );
    const records = active.batch.selection.map((combo) => {
      const existing = byKey.get(combo.key);
      if (existing !== undefined) return existing;
      return {
        comboKey: combo.key,
        provider: combo.provider,
        model: combo.model,
        reasoningEffort: combo.reasoningEffort ?? null,
        status: "pending",
        samples: [],
        median: null,
        min: null,
        max: null,
        usage: null,
        cost: null,
        error: null,
      };
    });
    active.batch.speedTests = records;
    if (this.config.speedRuns <= 0) {
      for (const record of records) {
        if (record.status === "pending" || record.status === "running") record.status = "skipped";
      }
      return;
    }
    // A resumed batch keeps speed samples it already measured; only incomplete
    // records are measured again.
    const queue = records.filter((record) => record.status !== "done" && record.status !== "skipped");
    for (const record of queue) {
      record.status = "pending";
      record.samples = [];
      record.median = null;
      record.min = null;
      record.max = null;
      record.usage = null;
      record.cost = null;
      record.error = null;
    }
    let cursor = 0;
    const limit = Math.max(1, Math.min(this.config.maxParallelModels, queue.length));
    const workers = Array.from({ length: limit }, async () => {
      while (!active.stopped) {
        const record = queue[cursor];
        cursor += 1;
        if (record === undefined) return;
        await this.#runSpeedTest(active, record);
      }
    });
    await Promise.all(workers);
    for (const record of records) {
      if (record.status === "pending" || record.status === "running") record.status = "stopped";
    }
  }

  async #runSpeedTest(active, record) {
    const llm = this.ctx.get("llm");
    if (llm === undefined) {
      record.status = "error";
      record.error = { code: "no-llm", message: "LLM service is unavailable" };
      return;
    }
    record.status = "running";
    const samples = [];
    let totalUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
    let totalCost = 0;
    try {
      for (let index = 0; index < this.config.speedRuns; index += 1) {
        if (active.stopped) break;
        const options = {
          provider: record.provider,
          model: record.model,
          messages: [{ role: "user", content: [{ type: "text", text: SPEED_PROMPT }] }],
          maxTokens: 512,
          sessionId: randomUUID(),
        };
        if (record.reasoningEffort) options.reasoningEffort = record.reasoningEffort;
        // A stuck speed probe must not occupy a batch slot for hours; it is not
        // part of the score, so give each sample its own short timeout.
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, SPEED_TIMEOUT_MS);
        timer.unref?.();
        const forwardAbort = () => controller.abort();
        if (active.controller.signal.aborted) controller.abort();
        else active.controller.signal.addEventListener("abort", forwardAbort, { once: true });
        options.signal = controller.signal;
        const started = performance.now();
        let firstTokenAt = null;
        let usage = null;
        let finish = null;
        try {
          for await (const chunk of llm.stream(options)) {
            const at = performance.now();
            if (firstTokenAt === null && (chunk?.type === "text-delta" || chunk?.type === "reasoning-delta")) {
              firstTokenAt = at;
            }
            if (chunk?.type === "usage") usage = chunk.usage;
            else if (chunk?.type === "finish") finish = chunk.reason;
          }
          if (timedOut) {
            const error = new Error(`speed sample exceeded ${SPEED_TIMEOUT_MS}ms`);
            error.code = "speed-timeout";
            throw error;
          }
        } finally {
          clearTimeout(timer);
          active.controller.signal.removeEventListener("abort", forwardAbort);
        }
        const ended = performance.now();
        if (finish !== null && finish.kind === "error") {
          const failure = finish.failure ?? {};
          const error = new Error(failure.message ?? "speed request failed");
          error.code = failure.code ?? "speed-request";
          throw error;
        }
        const ttftMs = firstTokenAt === null ? null : Math.round(firstTokenAt - started);
        const decodeMs = firstTokenAt === null ? 0 : ended - firstTokenAt;
        const outputTokens = Number(usage?.outputTokens) || 0;
        const tps =
          firstTokenAt !== null && decodeMs >= 300 && outputTokens > 0
            ? Number((outputTokens / (decodeMs / 1000)).toFixed(2))
            : null;
        const sampleUsage = usage ?? { inputTokens: 0, outputTokens: 0 };
        const priced = priceUsage(this.config.pricing, {
          model: record.model,
          usage: sampleUsage,
          at: started,
        });
        totalUsage.inputTokens += Number(sampleUsage.inputTokens) || 0;
        totalUsage.outputTokens += Number(sampleUsage.outputTokens) || 0;
        totalUsage.cacheReadTokens += Number(sampleUsage.cacheReadTokens) || 0;
        totalUsage.cacheWriteTokens += Number(sampleUsage.cacheWriteTokens) || 0;
        totalCost += priced.usd;
        samples.push({
          at: Date.now(),
          ttftMs,
          tps,
          totalMs: Math.round(ended - started),
          outputTokens,
          usage: {
            inputTokens: Number(sampleUsage.inputTokens) || 0,
            outputTokens,
            cacheReadTokens: Number(sampleUsage.cacheReadTokens) || 0,
          },
        });
      }
      record.samples = samples;
      record.median = medianMetrics(samples);
      record.min = minMetrics(samples);
      record.max = maxMetrics(samples);
      record.usage = totalUsage;
      record.cost = priceUsage(this.config.pricing, {
        model: record.model,
        usage: totalUsage,
        at: Date.now(),
      });
      record.status = samples.length > 0 ? "done" : "stopped";
      record.cost.usd = Number(totalCost.toFixed(6));
      record.cost.cny = Number((totalCost * this.config.pricing.usdToCny).toFixed(6));
    } catch (error) {
      record.status = "error";
      record.error = {
        code: error?.code ?? "speed",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    this.store.schedulePersist(active.batch);
  }

  // ── aggregation and teardown ───────────────────────────────────────────

  #digest(batch) {
    const lines = ["组合 | 总分 | 四题 | 费用(USD) | 耗时(s)"];
    for (const combo of batch.combos) {
      const scores = TASKS.map((task) => {
        const value = combo.scores?.[task.id];
        return value === null || value === undefined ? "缺" : String(value);
      }).join(" / ");
      const cost = combo.costUsd === null || combo.costUsd === undefined ? "—" : combo.costUsd.toFixed(4);
      const duration = combo.durationMs === null ? "—" : (combo.durationMs / 1000).toFixed(1);
      lines.push(`${combo.provider}/${combo.model} · ${combo.effortName ?? "默认"} | ${combo.total ?? "缺"} | ${scores} | ${cost} | ${duration}`);
    }
    return lines.join("\n");
  }

  async #summarize(active) {
    const main = active.mainHandle;
    if (main === null) return;
    const batch = active.batch;
    const digest = this.#digest(batch);
    const briefs = active.briefs.join("\n\n").slice(0, 24_000);
    const fallback = briefs === "" ? "" : `\n\n各组合逐题结果：\n${briefs}`;
    try {
      main.agent.followup({
        content: [{ type: "text", text: `${SUMMARY_INSTRUCTION}\n\n${digest}${fallback}` }],
        source: { kind: "user" },
      });
      const outcome = await this.#waitForIdle(active, main.agent, SUMMARY_TIMEOUT_MS);
      if (outcome !== "idle") return;
      const events = await this.#readEvents(main, main.agent.id);
      const text = lastAssistantText(events);
      const usage = foldUsage(events);
      batch.summary = {
        at: now(),
        provider: batch.judge.provider,
        model: batch.judge.model,
        reasoningEffort: batch.judge.reasoningEffort ?? null,
        text: text.slice(0, 12_000),
        usage,
        cost: priceUsage(this.config.pricing, { model: batch.judge.model, usage, at: now() }),
      };
    } catch (error) {
      batch.summary = {
        at: now(),
        provider: batch.judge.provider,
        model: batch.judge.model,
        text: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
    this.store.schedulePersist(batch);
  }

  /** Materialize per-combo scores/costs; safe to call before and after judging. */
  #buildCombos(batch) {
    batch.combos = batch.selection.map((selection) => {
      const runs = batch.runs.filter((run) => run.comboKey === selection.key);
      const totals = comboTotal(runs);
      const costUsd = runs.reduce((sum, run) => sum + (run.cost?.usd ?? 0) + (Number(run.retryCostUsd) || 0), 0);
      const costCny = runs.reduce((sum, run) => sum + (run.cost?.cny ?? 0) + (Number(run.retryCostCny) || 0), 0);
      const judgeCostUsd = runs.reduce((sum, run) => sum + (run.judgeCost?.usd ?? 0) + (Number(run.retryJudgeCostUsd) || 0), 0);
      const durations = runs.map((run) => (run.durationMs ?? 0) + (Number(run.retryDurationMs) || 0));
      const status = runs.some((run) => run.status === "judge_error")
        ? "judge_error"
        : runs.every((run) => run.status === "done")
          ? "done"
          : runs.some((run) => run.status === "interrupted")
            ? "interrupted"
            : runs.some((run) => run.status === "stopped" || run.status === "pending")
              ? "stopped"
              : "partial";
      return {
        key: selection.key,
        provider: selection.provider,
        providerName: selection.providerName,
        model: selection.model,
        modelName: selection.modelName,
        reasoningEffort: selection.reasoningEffort ?? null,
        effortName: selection.effortName,
        status,
        scores: totals.scores,
        statuses: totals.statuses,
        missing: totals.missing,
        complete: totals.complete,
        total: totals.total,
        maxScore: totals.maxScore,
        costUsd: Number(costUsd.toFixed(6)),
        costCny: Number(costCny.toFixed(6)),
        judgeCostUsd: Number(judgeCostUsd.toFixed(6)),
        durationMs: durations.reduce((sum, value) => sum + value, 0),
        isolationSuspect: runs.some((run) => run?.detail?.isolation?.verdict === "suspect"),
      };
    });
    this.#updateProgress(batch);
  }

  async #finalize(active) {
    if (active.finalized === true) return;
    active.finalized = true;
    const batch = active.batch;
    const main = active.mainHandle;
    this.#buildCombos(batch);
    if (batch.status === "running") {
      if (active.stopped) {
        const interrupted = active.reason === INTERRUPT_REASON;
        batch.status = active.timedOut ? "error" : interrupted ? "interrupted" : "stopped";
        if (active.timedOut) {
          batch.error = { code: "batch-timeout", message: `batch exceeded ${this.config.perBatchTimeoutMs}ms` };
          this.store.schedulePersist(batch, 0);
        } else if (interrupted) {
          batch.error = { code: INTERRUPT_REASON, message: INTERRUPT_MESSAGE };
          batch.interruptedAt = batch.interruptedAt ?? now();
        }
      } else {
        batch.status = this.#overallStatus(batch);
      }
    }
    batch.finishedAt = now();
    batch.activeMs = (Number(batch.activeMs) || 0) + Math.max(0, batch.finishedAt - active.segmentStart);
    batch.durationMs = batch.activeMs;

    const sessionIds = [
      batch.workspace.mainSessionId,
      ...batch.runs.flatMap((run) => [
        run.sessionId,
        ...(Array.isArray(run.attempts) ? run.attempts.map((attempt) => attempt?.sessionId) : []),
      ]),
    ].filter((id) => typeof id === "string" && id !== "");
    try {
      await this.store.recordEvalSessions(sessionIds);
    } catch {
      // Performance exclusion is best-effort.
    }
    if (main !== null) {
      try {
        this.ctx.get("workspaceRegistry")?.archiveSession(main.agent.id);
      } catch {
        // Best-effort.
      }
      try {
        await main.dispose();
      } catch {
        // Best-effort.
      }
      active.handles.delete(main);
    }
    this.active = null;
    this.lastBatchId = batch.id;
    try {
      await this.store.finishBatch(batch);
    } catch {
      // The in-memory batch is still returned by status().
    }
  }
}

/** Strip long artifact texts from a live progress poll; detail pages re-read them. */
function compactBatch(batch) {
  for (const run of batch.runs ?? []) {
    if (run.detail === null || typeof run.detail !== "object") continue;
    for (const key of ["svgText", "htmlText", "answerText", "finalText"]) {
      if (typeof run.detail[key] === "string" && run.detail[key].length > 400) {
        run.detail[key] = `${run.detail[key].slice(0, 400)}…`;
      }
    }
  }
  if (batch.summary !== null && typeof batch.summary === "object" && typeof batch.summary.text === "string") {
    if (batch.summary.text.length > 400) batch.summary.text = `${batch.summary.text.slice(0, 400)}…`;
  }
  return batch;
}

function medianOf(values) {
  const numbers = values.filter((value) => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (numbers.length === 0) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 0 ? (numbers[middle - 1] + numbers[middle]) / 2 : numbers[middle];
}

function medianMetrics(samples) {
  const ttft = medianOf(samples.map((sample) => sample.ttftMs));
  const tps = medianOf(samples.map((sample) => sample.tps));
  const total = medianOf(samples.map((sample) => sample.totalMs));
  if (ttft === null && tps === null) return null;
  return {
    ttftMs: ttft === null ? null : Math.round(ttft),
    tps: tps === null ? null : Number(tps.toFixed(2)),
    totalMs: total === null ? null : Math.round(total),
  };
}

function minMetrics(samples) {
  const pick = (key, rounding) => {
    const values = samples.map((sample) => sample[key]).filter((value) => typeof value === "number" && Number.isFinite(value));
    if (values.length === 0) return null;
    const value = Math.min(...values);
    return rounding === "int" ? Math.round(value) : Number(value.toFixed(2));
  };
  return { ttftMs: pick("ttftMs", "int"), tps: pick("tps"), totalMs: pick("totalMs", "int") };
}

function maxMetrics(samples) {
  const pick = (key, rounding) => {
    const values = samples.map((sample) => sample[key]).filter((value) => typeof value === "number" && Number.isFinite(value));
    if (values.length === 0) return null;
    const value = Math.max(...values);
    return rounding === "int" ? Math.round(value) : Number(value.toFixed(2));
  };
  return { ttftMs: pick("ttftMs", "int"), tps: pick("tps"), totalMs: pick("totalMs", "int") };
}

function turnOutcome(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.type === "turn/end") return events[index].data?.reason ?? null;
  }
  return null;
}