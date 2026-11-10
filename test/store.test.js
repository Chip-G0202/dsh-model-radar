import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Store } from "../lib/store.js";

function makeBatch(id, { createdAt = Date.now(), status = "done", total = 100 } = {}) {
  const running = status === "running";
  return {
    id,
    createdAt,
    startedAt: createdAt + 1000,
    finishedAt: null,
    durationMs: null,
    status,
    judge: { provider: "judge-provider", model: "judge-model", reasoningEffort: "high" },
    taskVersion: "mr-four-150-v1",
    rubricVersion: "mr-rubric-150-v1",
    selection: [],
    workspace: { dir: `/tmp/${id}`, runRoot: `/tmp/${id}/runs`, mainSessionId: `${id}-main` },
    runs: [
      {
        id: `${id}::candy`,
        comboKey: "combo",
        taskId: "candy",
        status: running ? "running" : "done",
        score: running ? null : 22.5,
      },
      {
        id: `${id}::pompeii`,
        comboKey: "combo",
        taskId: "pompeii",
        status: running ? "pending" : "done",
        score: running ? null : 40.5,
      },
    ],
    speedTests: [],
    combos: [
      {
        key: "combo",
        status: running ? "running" : "done",
        total: running ? null : total,
        costUsd: 0.02,
      },
    ],
    summary: { at: createdAt, text: "summary text" },
    progress: { done: running ? 0 : 2, failed: 0, stopped: 0, total: 2 },
    error: null,
  };
}

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mr-store-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

async function findTempFiles(dir) {
  const found = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith(".tmp")) found.push(file);
    }
  }
  await walk(dir);
  return found;
}

async function readState(dir) {
  return JSON.parse(await readFile(path.join(dir, "state.json"), "utf8"));
}

test("init creates the data directory and batches directory", async (t) => {
  const dir = await tempDir(t);
  const store = new Store({ dir });

  const result = await store.init();
  assert.deepEqual(result, { interrupted: [] });
  assert.equal(store.dataDir, dir);
  assert.equal((await stat(dir)).isDirectory(), true);
  assert.equal((await stat(path.join(dir, "batches"))).isDirectory(), true);
  assert.deepEqual(store.listBatches(), []);
  assert.deepEqual(store.evalSessionIds, []);
});

test("createBatch writes state.json and batches/<id>.json", async (t) => {
  const dir = await tempDir(t);
  const store = new Store({ dir });
  await store.init();

  await store.createBatch(makeBatch("mr-old", { createdAt: 1000, total: 50 }));
  await store.createBatch(makeBatch("mr-new", { createdAt: 2000, total: 75 }));

  const state = await readState(dir);
  assert.equal(state.version, 1);
  assert.deepEqual(
    state.batches.map((entry) => entry.id),
    ["mr-new", "mr-old"],
  );
  assert.equal(state.batches[0].comboCount, 1);
  assert.equal(state.batches[0].runCount, 2);
  assert.equal(state.batches[0].doneCount, 2);
  assert.equal(state.batches[0].totalScore, 75);

  assert.equal((await stat(path.join(dir, "batches", "mr-new.json"))).isFile(), true);
  assert.equal((await stat(path.join(dir, "batches", "mr-old.json"))).isFile(), true);

  const detail = await store.getBatch("mr-new");
  assert.equal(detail.id, "mr-new");
  assert.equal(detail.status, "done");
  assert.equal(detail.combos[0].total, 75);
  assert.equal(await store.getBatch("missing-batch"), null);
  assert.equal(await store.getBatch("../state"), null);
  assert.equal(await store.getBatch(".."), null);
  assert.equal(await store.getBatch("/etc/passwd"), null);

  assert.deepEqual(
    store.listBatches().map((entry) => entry.id),
    ["mr-new", "mr-old"],
  );
});

test("persistBatch updates the index and the batch detail", async (t) => {
  const dir = await tempDir(t);
  const store = new Store({ dir });
  await store.init();

  const batch = makeBatch("mr-persist", { createdAt: 1000, status: "running", total: null });
  await store.createBatch(batch);
  assert.equal(store.listBatches()[0].status, "running");
  assert.equal(store.listBatches()[0].totalScore, 0);

  batch.status = "done";
  batch.finishedAt = 2500;
  batch.durationMs = 1500;
  batch.combos[0].status = "done";
  batch.combos[0].total = 120;
  batch.runs[0].status = "done";
  batch.runs[0].score = 22.5;
  batch.runs[1].status = "done";
  batch.runs[1].score = 40.5;
  await store.persistBatch(batch);

  const entry = store.listBatches()[0];
  assert.equal(entry.id, "mr-persist");
  assert.equal(entry.status, "done");
  assert.equal(entry.totalScore, 120);
  assert.equal(entry.doneCount, 2);
  assert.equal(entry.errorCount, 0);
  assert.equal(entry.finishedAt, 2500);

  const state = await readState(dir);
  assert.equal(state.batches[0].status, "done");
  assert.equal(state.batches[0].totalScore, 120);

  const detail = await store.getBatch("mr-persist");
  assert.equal(detail.status, "done");
  assert.equal(detail.combos[0].total, 120);
  assert.equal(detail.runs[0].score, 22.5);
});

test("atomic writes leave no .tmp files behind", async (t) => {
  const dir = await tempDir(t);
  const store = new Store({ dir });
  await store.init();

  const batch = makeBatch("mr-atomic", { createdAt: 1000, status: "running", total: null });
  await store.createBatch(batch);
  batch.status = "done";
  batch.combos[0].status = "done";
  batch.combos[0].total = 10;
  await store.persistBatch(batch);

  assert.deepEqual(await findTempFiles(dir), []);
  assert.equal((await readState(dir)).batches[0].id, "mr-atomic");
  assert.equal((await store.getBatch("mr-atomic")).id, "mr-atomic");
});

test("init migrates a persisted running batch to interrupted", async (t) => {
  const dir = await tempDir(t);
  const first = new Store({ dir });
  await first.init();
  await first.createBatch(makeBatch("mr-running", { createdAt: 1000, status: "running", total: null }));

  const second = new Store({ dir });
  const result = await second.init();
  assert.deepEqual(result.interrupted, ["mr-running"]);

  const entry = second.listBatches().find((row) => row.id === "mr-running");
  assert.equal(entry.status, "interrupted");
  assert.equal(typeof entry.finishedAt, "number");

  const detail = await second.getBatch("mr-running");
  assert.equal(detail.status, "interrupted");
  assert.equal(typeof detail.interruptedAt, "number");
  assert.deepEqual(
    detail.runs.map((run) => run.status),
    ["interrupted", "interrupted"],
  );
  assert.equal(detail.combos[0].status, "interrupted");
  assert.equal((await readState(dir)).batches[0].status, "interrupted");
  assert.deepEqual(await findTempFiles(dir), []);
});

test("retentionBatches=2 prunes older index entries", async (t) => {
  const dir = await tempDir(t);
  const store = new Store({ dir, retentionBatches: 2 });
  await store.init();

  await store.createBatch(makeBatch("b1", { createdAt: 1000, total: 10 }));
  await store.createBatch(makeBatch("b2", { createdAt: 2000, total: 20 }));
  await store.createBatch(makeBatch("b3", { createdAt: 3000, total: 30 }));

  assert.deepEqual(
    store.listBatches().map((entry) => entry.id),
    ["b3", "b2"],
  );
  const state = await readState(dir);
  assert.deepEqual(
    state.batches.map((entry) => entry.id),
    ["b3", "b2"],
  );
});

test("recordEvalSessions dedupes ids and persists them", async (t) => {
  const dir = await tempDir(t);
  const store = new Store({ dir });
  await store.init();

  await store.recordEvalSessions(["s1", "s2", "s1", "", null]);
  assert.deepEqual(store.evalSessionIds, ["s1", "s2"]);
  assert.equal(store.isEvalSession("s1"), true);
  assert.equal(store.isEvalSession("s2"), true);
  assert.equal(store.isEvalSession("s3"), false);

  const state = await readState(dir);
  assert.deepEqual(state.evalSessionIds, ["s1", "s2"]);

  const reloaded = new Store({ dir });
  await reloaded.init();
  assert.equal(reloaded.isEvalSession("s1"), true);
  assert.equal(reloaded.isEvalSession("s2"), true);
  assert.equal(reloaded.isEvalSession("missing"), false);

  await reloaded.recordEvalSessions(["s2", "s3"]);
  assert.deepEqual(reloaded.evalSessionIds, ["s1", "s2", "s3"]);
  assert.equal(reloaded.isEvalSession("s3"), true);
});