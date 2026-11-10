// dsh-model-radar — JSON result store.
//
// Layout (default dataDir = ~/.dsh/model-radar):
//   state.json            batch index + benchmark session ids (atomic write)
//   batches/<id>.json     one full batch record
//   runs/...              per-run working directories and artifacts
//
// All writes go through one serialized queue and use write-temp + rename so a
// crash never leaves a half-written JSON file behind.

import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const STATE_VERSION = 1;

function now() {
  return Date.now();
}

async function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  const handle = await open(tmp, "w");
  try {
    await handle.writeFile(text, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmp, file);
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

export function resolveDataDir(config) {
  const configured = typeof config?.dataDir === "string" ? config.dataDir.trim() : "";
  if (configured !== "") return path.resolve(configured.replace(/^~(?=$|[\\/])/, os.homedir()));
  return path.join(os.homedir(), ".dsh", "model-radar");
}

export class Store {
  constructor({ dir, retentionBatches = 200 }) {
    this.dir = dir;
    this.retentionBatches = Math.max(1, Math.min(5000, Number(retentionBatches) || 200));
    this.stateFile = path.join(dir, "state.json");
    this.batchDir = path.join(dir, "batches");
    this.state = {
      version: STATE_VERSION,
      updatedAt: now(),
      batches: [],
      evalSessionIds: [],
    };
    this.evalSet = new Set();
    this.progressTimers = new Map();
    this.queue = Promise.resolve();
  }

  async init() {
    await mkdir(this.dir, { recursive: true });
    await mkdir(this.batchDir, { recursive: true });
    const state = await readJson(this.stateFile);
    if (state !== null && typeof state === "object") {
      this.state = {
        version: STATE_VERSION,
        updatedAt: Number(state.updatedAt) || now(),
        batches: Array.isArray(state.batches) ? state.batches : [],
        evalSessionIds: Array.isArray(state.evalSessionIds) ? state.evalSessionIds : [],
      };
    }
    this.evalSet = new Set(this.state.evalSessionIds);
    const interrupted = [];
    for (const entry of this.state.batches) {
      if (entry.status === "running") {
        entry.status = "interrupted";
        entry.finishedAt = entry.finishedAt ?? now();
        interrupted.push(entry);
      }
    }
    if (interrupted.length > 0) {
      for (const entry of interrupted) {
        const detail = await readJson(path.join(this.batchDir, `${entry.id}.json`));
        if (detail !== null) {
          detail.status = "interrupted";
          detail.finishedAt = detail.finishedAt ?? entry.finishedAt;
          detail.interruptedAt = now();
          detail.error = detail.error ?? {
            code: "app-restart",
            message: "应用退出或插件重载导致评测中断；可点「继续运行」从剩余题目接着跑",
          };
          for (const run of detail.runs ?? []) {
            if (run.status === "running" || run.status === "pending") run.status = "interrupted";
          }
          for (const combo of detail.combos ?? []) {
            if (combo.status === "running" || combo.status === "pending") combo.status = "interrupted";
          }
          await writeAtomic(path.join(this.batchDir, `${entry.id}.json`), JSON.stringify(detail, null, 2));
        }
      }
      await this.#writeState();
    }
    return { interrupted: interrupted.map((entry) => entry.id) };
  }

  get dataDir() {
    return this.dir;
  }

  batchPath(id) {
    return path.join(this.batchDir, `${id}.json`);
  }

  #serialize(operation) {
    const run = this.queue.then(operation, operation);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async #writeState() {
    this.state.updatedAt = now();
    await writeAtomic(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  #indexEntry(batch) {
    const runs = batch.runs ?? [];
    const combos = batch.combos ?? [];
    const totalCostUsd = combos.reduce((sum, combo) => sum + (Number(combo.costUsd) || 0), 0);
    const totalScore = combos.reduce((sum, combo) => sum + (Number(combo.total) || 0), 0);
    const best = combos.reduce((max, combo) => Math.max(max, Number(combo.total) || 0), 0);
    return {
      id: batch.id,
      createdAt: batch.createdAt,
      startedAt: batch.startedAt,
      finishedAt: batch.finishedAt ?? null,
      status: batch.status,
      taskVersion: batch.taskVersion ?? null,
      rubricVersion: batch.rubricVersion ?? null,
      judge: batch.judge,
      comboCount: combos.length,
      runCount: runs.length,
      doneCount: runs.filter((run) => run.status === "done").length,
      errorCount: runs.filter(
        (run) => run.status === "error" || run.status === "timeout" || run.status === "judge_error",
      ).length,
      totalScore: Number(totalScore.toFixed(2)),
      bestScore: Number(best.toFixed(2)),
      totalCostUsd,
      durationMs: batch.durationMs ?? null,
      summary: batch.summary?.text ? String(batch.summary.text).slice(0, 400) : null,
    };
  }

  async createBatch(batch) {
    return this.#serialize(async () => {
      this.state.batches.unshift(this.#indexEntry(batch));
      this.#prune();
      await writeAtomic(this.batchPath(batch.id), JSON.stringify(batch, null, 2));
      await this.#writeState();
    });
  }

  async persistBatch(batch) {
    return this.#serialize(async () => {
      await writeAtomic(this.batchPath(batch.id), JSON.stringify(batch, null, 2));
      const entry = this.#indexEntry(batch);
      const index = this.state.batches.findIndex((row) => row.id === batch.id);
      if (index >= 0) this.state.batches[index] = entry;
      else this.state.batches.unshift(entry);
      this.#prune();
      await this.#writeState();
    });
  }

  /** Throttled progress persistence for long batches; safe to call per run. */
  schedulePersist(batch, delayMs = 1500) {
    const pending = this.progressTimers.get(batch.id);
    if (pending !== undefined) return;
    const timer = setTimeout(() => {
      this.progressTimers.delete(batch.id);
      this.persistBatch(batch).catch(() => undefined);
    }, delayMs);
    timer.unref?.();
    this.progressTimers.set(batch.id, timer);
  }

  async finishBatch(batch) {
    const timer = this.progressTimers.get(batch.id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.progressTimers.delete(batch.id);
    }
    return this.persistBatch(batch);
  }

  async getBatch(id) {
    // Localhost HTTP callers can pass arbitrary ids; never let one escape the
    // batch directory via `..` or a path separator.
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
    return readJson(this.batchPath(id));
  }

  listBatches() {
    return [...this.state.batches].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  async recordEvalSessions(ids) {
    let changed = false;
    for (const id of ids) {
      if (typeof id !== "string" || id === "" || this.evalSet.has(id)) continue;
      this.evalSet.add(id);
      this.state.evalSessionIds.push(id);
      changed = true;
    }
    if (!changed) return;
    const overflow = this.state.evalSessionIds.length - 5000;
    if (overflow > 0) {
      const dropped = this.state.evalSessionIds.splice(0, overflow);
      for (const id of dropped) this.evalSet.delete(id);
    }
    await this.#serialize(() => this.#writeState());
  }

  isEvalSession(id) {
    return this.evalSet.has(id);
  }

  get evalSessionIds() {
    return this.state.evalSessionIds;
  }

  #prune() {
    if (this.state.batches.length <= this.retentionBatches) return;
    this.state.batches = this.state.batches
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, this.retentionBatches);
  }
}