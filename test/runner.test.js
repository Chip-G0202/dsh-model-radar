import test from "node:test";
import assert from "node:assert/strict";

import {
  Runner,
  archiveRunAttempt,
  archiveRunForRerun,
  canResumeBatch,
  canRerunBatch,
  cancelAgentQuietly,
  prepareResumeRuns,
  resetRunForResume,
  shouldRetryRun,
  unfinishedRuns,
} from "../lib/runner.js";
import { RUBRIC_VERSION, TASK_VERSION } from "../lib/tasks.js";

function makeRun(taskId, status, extra = {}) {
  return {
    id: `combo::${taskId}`,
    comboKey: "combo",
    taskId,
    status,
    score: status === "done" ? 22.5 : null,
    sessionId: `session-${taskId}`,
    files: [{ name: "result.svg" }],
    detail: { finalText: "answer", artifactDir: "runs/batch/combo/qin" },
    usage: { inputTokens: 1 },
    cost: { usd: 0.01 },
    judgeUsage: null,
    judgeCost: null,
    error: status === "done" ? null : { code: "stopped", message: "disposed" },
    startedAt: 1000,
    finishedAt: 2000,
    durationMs: 1000,
    ...extra,
  };
}

function makeBatch(status, statuses) {
  return {
    id: "mr-test",
    status,
    taskVersion: TASK_VERSION,
    rubricVersion: RUBRIC_VERSION,
    runs: statuses.map((entry, index) => makeRun(["candy", "pompeii", "pelican", "qin"][index], entry)),
  };
}

test("unfinishedRuns keeps everything that is not done", () => {
  const batch = makeBatch("interrupted", ["done", "interrupted", "pending", "stopped"]);
  assert.deepEqual(
    unfinishedRuns(batch).map((run) => run.taskId),
    ["pompeii", "pelican", "qin"],
  );
  assert.deepEqual(unfinishedRuns(null), []);
  assert.deepEqual(unfinishedRuns({}), []);
});

test("unfinishedRuns treats a resumed pending run as unfinished", () => {
  const batch = makeBatch("running", ["done", "done", "pending", "pending"]);
  assert.equal(unfinishedRuns(batch).length, 2);
});

test("resetRunForResume clears every trace of the interrupted attempt", () => {
  const run = makeRun("qin", "interrupted");
  resetRunForResume(run);
  assert.equal(run.status, "pending");
  assert.equal(run.score, null);
  assert.equal(run.sessionId, null);
  assert.deepEqual(run.files, []);
  assert.deepEqual(run.detail, {});
  assert.equal(run.usage, null);
  assert.equal(run.cost, null);
  assert.equal(run.judgeUsage, null);
  assert.equal(run.judgeCost, null);
  assert.equal(run.error, null);
  assert.equal(run.startedAt, null);
  assert.equal(run.finishedAt, null);
  assert.equal(run.durationMs, null);
  // Identity of the run must survive so the lane can match it again.
  assert.equal(run.id, "combo::qin");
  assert.equal(run.comboKey, "combo");
  assert.equal(run.taskId, "qin");
});

test("canResumeBatch only allows settled batches with unfinished runs", () => {
  assert.equal(canResumeBatch(makeBatch("interrupted", ["done", "interrupted", "pending", "stopped"])), true);
  assert.equal(canResumeBatch(makeBatch("stopped", ["done", "done", "stopped", "stopped"])), true);
  assert.equal(canResumeBatch(makeBatch("partial", ["done", "done", "done", "error"])), true);
  assert.equal(canResumeBatch(makeBatch("done", ["done", "done", "done", "done"])), false);
  assert.equal(canResumeBatch(makeBatch("running", ["done", "pending", "pending", "pending"])), false);
  assert.equal(canResumeBatch(null), false);
  assert.equal(canResumeBatch({}), false);
  assert.equal(canResumeBatch({ ...makeBatch("stopped", ["done", "stopped", "pending", "pending"]), taskVersion: "old" }), false);
});

test("canRerunBatch allows any settled batch of the current protocol", () => {
  assert.equal(canRerunBatch(makeBatch("done", ["done", "done", "done", "done"])), true);
  assert.equal(canRerunBatch(makeBatch("partial", ["done", "done", "error", "timeout"])), true);
  assert.equal(canRerunBatch(makeBatch("interrupted", ["done", "interrupted", "pending", "stopped"])), true);
  assert.equal(canRerunBatch(makeBatch("running", ["done", "pending", "pending", "pending"])), false);
  assert.equal(canRerunBatch(null), false);
  assert.equal(canRerunBatch({}), false);
  assert.equal(canRerunBatch({ ...makeBatch("done", ["done", "done", "done", "done"]), taskVersion: "old" }), false);
  assert.equal(canRerunBatch({ ...makeBatch("done", ["done", "done", "done", "done"]), rubricVersion: "old" }), false);
});

const RESUME_COMBOS = ["combo-a", "combo-b"];
const RESUME_TASKS = ["candy", "pompeii", "pelican", "qin"];

function makeResumeBatch() {
  const statuses = { candy: "done", pompeii: "error", pelican: "timeout", qin: "stopped" };
  const runs = [];
  for (const comboKey of RESUME_COMBOS) {
    for (const taskId of RESUME_TASKS) {
      const run = makeRun(taskId, statuses[taskId]);
      run.id = `${comboKey}::${taskId}`;
      run.comboKey = comboKey;
      runs.push(run);
    }
  }
  return {
    id: "mr-resume",
    status: "partial",
    taskVersion: TASK_VERSION,
    rubricVersion: RUBRIC_VERSION,
    selection: RESUME_COMBOS.map((key) => ({ key })),
    runs,
  };
}

function runOf(batch, comboKey, taskId) {
  return batch.runs.find((run) => run.comboKey === comboKey && run.taskId === taskId);
}

test("prepareResumeRuns intersects comboKeys with taskIds", () => {
  const batch = makeResumeBatch();
  const prepared = prepareResumeRuns(batch, { comboKeys: ["combo-a"], taskIds: ["qin"] });
  assert.equal(prepared.remaining, 1);
  assert.equal(prepared.rerun, false);
  const run = runOf(batch, "combo-a", "qin");
  assert.equal(run.status, "pending");
  assert.equal(run.sessionId, null);
  assert.equal(run.attempts.length, 1);
  assert.equal(run.attempts[0].kind, undefined);
  // The other combos keep their previous state.
  assert.equal(runOf(batch, "combo-b", "qin").status, "stopped");
  assert.equal(runOf(batch, "combo-a", "candy").status, "done");
});

test("prepareResumeRuns accepts taskIds alone across every combo", () => {
  const batch = makeResumeBatch();
  const prepared = prepareResumeRuns(batch, { taskIds: ["qin"] });
  assert.equal(prepared.remaining, 2);
  assert.equal(prepared.rerun, false);
  for (const comboKey of RESUME_COMBOS) assert.equal(runOf(batch, comboKey, "qin").status, "pending");
});

test("prepareResumeRuns archives a done run as a rerun attempt and bumps rerunCount", () => {
  const batch = makeResumeBatch();
  const run = runOf(batch, "combo-a", "candy");
  assert.equal(run.rerunCount, undefined);
  const prepared = prepareResumeRuns(batch, { comboKeys: ["combo-a"], taskIds: ["candy"] });
  assert.equal(prepared.rerun, true);
  assert.equal(run.status, "pending");
  assert.equal(run.score, null);
  assert.equal(run.rerunCount, 1);
  assert.equal(run.attempts.length, 1);
  assert.equal(run.attempts[0].kind, "rerun");
  assert.equal(run.attempts[0].status, "done");
  assert.equal(run.attempts[0].score, 22.5);
  // The finished attempt's cost is preserved in the retry ledger.
  assert.equal(run.retryCostUsd, 0.01);

  // A second rerun of the same run stacks another rerun attempt and counter.
  run.status = "done";
  run.score = 20;
  run.score100 = 80;
  const again = prepareResumeRuns(batch, { runIds: ["combo-a::candy"] });
  assert.equal(again.rerun, true);
  assert.equal(run.rerunCount, 2);
  assert.equal(run.attempts.length, 2);
  assert.deepEqual(
    run.attempts.map((attempt) => attempt.kind),
    ["rerun", "rerun"],
  );
});

test("prepareResumeRuns keeps automatic retry attempts apart from a rerun", () => {
  const batch = makeResumeBatch();
  const run = runOf(batch, "combo-a", "candy");
  run.attempts = [{ n: 1, status: "timeout", cost: { usd: 0.02 } }];
  run.retryCostUsd = 0.02;
  prepareResumeRuns(batch, { runIds: [run.id] });
  assert.equal(run.attempts.length, 2);
  assert.equal(run.attempts.filter((attempt) => attempt?.kind !== "rerun").length, 1);
  assert.equal(run.attempts[1].kind, "rerun");
  assert.equal(run.retryCostUsd, 0.03);
  assert.equal(run.rerunCount, 1);
});

test("prepareResumeRuns throws empty-selection for an empty or unmatched matrix", () => {
  const codes = [];
  for (const options of [
    { comboKeys: [], taskIds: [] },
    { comboKeys: [] },
    { taskIds: [] },
    { comboKeys: ["missing-combo"] },
    { taskIds: ["missing-task"] },
  ]) {
    try {
      prepareResumeRuns(makeResumeBatch(), options);
      codes.push(null);
    } catch (error) {
      codes.push(error.code);
    }
  }
  assert.deepEqual(codes, ["empty-selection", "empty-selection", "empty-selection", "empty-selection", "empty-selection"]);
});

test("prepareResumeRuns lets runIds win over comboKeys/taskIds", () => {
  const batch = makeResumeBatch();
  const prepared = prepareResumeRuns(batch, {
    runIds: ["combo-a::pelican"],
    comboKeys: ["combo-b"],
    taskIds: ["candy"],
  });
  assert.equal(prepared.remaining, 1);
  assert.equal(runOf(batch, "combo-a", "pelican").status, "pending");
  assert.equal(runOf(batch, "combo-b", "candy").status, "done");
  assert.equal(runOf(batch, "combo-b", "pelican").status, "timeout");
});

test("prepareResumeRuns without options reruns every unfinished run", () => {
  const batch = makeResumeBatch();
  const prepared = prepareResumeRuns(batch, {});
  assert.equal(prepared.remaining, 6);
  assert.equal(prepared.rerun, false);
  assert.equal(batch.runs.filter((run) => run.status === "pending").length, 6);
});

test("prepareResumeRuns reports unknown runIds and fully finished batches", () => {
  assert.throws(
    () => prepareResumeRuns(makeResumeBatch(), { runIds: ["nope::nope"] }),
    (error) => error.code === "not-found",
  );
  const finished = makeBatch("done", ["done", "done", "done", "done"]);
  assert.throws(() => prepareResumeRuns(finished, {}), (error) => error.code === "nothing-to-resume");
});

function makeRunner(t, { reason = null, status = "running" } = {}) {
  const persisted = [];
  const store = {
    dataDir: "/tmp/mr-unit",
    schedulePersist: (batch, delay) => persisted.push({ batch, delay }),
    listBatches: () => [],
    getBatch: async () => null,
  };
  const ctx = { get: () => undefined };
  const runner = new Runner({
    ctx,
    config: { perBatchTimeoutMs: 1000 },
    store,
    ready: Promise.resolve(),
  });
  const batch = { id: "mr-unit", status, runs: [], error: null, startedAt: 1 };
  const active = {
    batch,
    controller: new AbortController(),
    handles: new Set(),
    stopped: false,
    reason,
    timedOut: false,
    startedAt: 1,
    segmentStart: 1,
    mainHandle: null,
    briefs: [],
  };
  runner.active = active;
  t.after(() => runner.dispose());
  return { runner, batch, active, persisted };
}

test("dispose marks a running batch as interrupted by the plugin and persists the reason", (t) => {
  const { runner, batch, active, persisted } = makeRunner(t);
  runner.dispose();
  assert.equal(active.stopped, true);
  assert.equal(active.reason, "plugin-reload");
  assert.equal(batch.status, "interrupted");
  assert.equal(batch.error.code, "plugin-reload");
  assert.equal(typeof batch.interruptedAt, "number");
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].delay, 0);
});

test("dispose does not relabel a batch the user already stopped", (t) => {
  const { runner, batch, active, persisted } = makeRunner(t, { reason: "user" });
  runner.dispose();
  assert.equal(active.stopped, true);
  assert.equal(active.reason, "user");
  assert.equal(batch.status, "running");
  assert.equal(batch.error, null);
  assert.equal(persisted.length, 0);
});

test("dispose without an active batch is a no-op", () => {
  const runner = new Runner({
    ctx: { get: () => undefined },
    config: { perBatchTimeoutMs: 1000 },
    store: { dataDir: "/tmp/mr-unit", schedulePersist: () => undefined, listBatches: () => [], getBatch: async () => null },
    ready: Promise.resolve(),
  });
  runner.dispose();
  assert.equal(runner.disposed, true);
});

test("status strips answers when another batch is requested during a live run", async (t) => {
  const other = {
    id: "mr-other",
    status: "stopped",
    taskVersion: TASK_VERSION,
    rubricVersion: RUBRIC_VERSION,
    runs: [
      {
        id: "combo::candy",
        comboKey: "combo",
        taskId: "candy",
        status: "done",
        score: 22.5,
        score100: 100,
        sessionId: "secret-session",
        files: [{ name: "result.svg" }],
        detail: { finalText: "最终答案：15" },
      },
    ],
    selection: [],
    combos: [],
  };
  const runner = new Runner({
    ctx: { get: () => undefined },
    config: { perBatchTimeoutMs: 1000 },
    store: {
      dataDir: "/tmp/mr-unit",
      schedulePersist: () => undefined,
      listBatches: () => [],
      getBatch: async (id) => (id === "mr-other" ? other : null),
    },
    ready: Promise.resolve(),
  });
  runner.active = {
    batch: { id: "mr-live", status: "running", runs: [] },
    controller: new AbortController(),
    handles: new Set(),
    stopped: false,
    reason: null,
    timedOut: false,
    startedAt: 1,
    segmentStart: 1,
    mainHandle: null,
    briefs: [],
  };
  t.after(() => runner.dispose());
  const result = await runner.status("mr-other");
  assert.equal(result.running, false);
  assert.equal(result.resumable, false);
  assert.equal(result.rerunnable, true);
  assert.equal(result.batch.rerunnable, true);
  const run = result.batch.runs[0];
  assert.equal(run.score, undefined);
  assert.equal(run.score100, undefined);
  assert.equal(run.sessionId, undefined);
  assert.equal(run.detail, undefined);
  assert.equal(other.runs[0].score, 22.5);
});

test("status reports the live batch as neither resumable nor rerunnable", async (t) => {
  const { runner } = makeRunner(t);
  const result = await runner.status();
  assert.equal(result.running, true);
  assert.equal(result.resumable, false);
  assert.equal(result.rerunnable, false);
  assert.equal(result.batch.rerunnable, false);
});

test("archiveRunAttempt keeps the failed attempt ledger across a fresh-context reset", () => {
  const run = {
    status: "timeout",
    sessionId: "session-1",
    score: null,
    score100: null,
    error: { code: "timeout", message: "task exceeded 3600000ms" },
    finishedAt: 123,
    durationMs: 5000,
    usage: { inputTokens: 10, outputTokens: 20, cacheReadTokens: 3, cacheWriteTokens: 4 },
    cost: { usd: 0.25, cny: 1.775 },
    judgeUsage: null,
    judgeCost: null,
    detail: { isolation: { verdict: "blocked" } },
  };
  archiveRunAttempt(run);
  assert.equal(run.attempts.length, 1);
  assert.equal(run.attempts[0].status, "timeout");
  assert.equal(run.attempts[0].isolation.verdict, "blocked");
  assert.equal(run.retryCostUsd, 0.25);
  assert.equal(run.retryDurationMs, 5000);
  assert.equal(run.retryUsage.outputTokens, 20);

  resetRunForResume(run);
  assert.equal(run.status, "pending");
  assert.equal(run.detail.isolation, undefined);
  assert.equal(run.attempts.length, 1);
  assert.equal(run.retryCostUsd, 0.25);
});

test("shouldRetryRun retries only infrastructure/timeout/judge failures", () => {
  assert.equal(shouldRetryRun({ status: "timeout" }), true);
  assert.equal(shouldRetryRun({ status: "error" }), true);
  assert.equal(shouldRetryRun({ status: "judge_error" }), true);
  assert.equal(shouldRetryRun({ status: "done" }), false);
  assert.equal(shouldRetryRun({ status: "stopped" }), false);
  assert.equal(shouldRetryRun({ status: "interrupted" }), false);
  assert.equal(shouldRetryRun({ status: "error" }, { stopped: true }), false);
  assert.equal(shouldRetryRun({ status: "error" }, { timedOut: true }), false);
});

test("cancelAgentQuietly tolerates sync, undefined and rejecting cancel results", () => {
  assert.doesNotThrow(() => cancelAgentQuietly({ agent: { cancel: () => undefined } }));
  assert.doesNotThrow(() => cancelAgentQuietly({ agent: { cancel: () => ({ catch: () => undefined }) } }));
  assert.doesNotThrow(() => cancelAgentQuietly({ agent: { cancel: () => Promise.reject(new Error("nope")) } }));
  assert.doesNotThrow(() => cancelAgentQuietly({ agent: { cancel: () => { throw new Error("sync boom"); } } }));
  assert.doesNotThrow(() => cancelAgentQuietly(null));
  assert.doesNotThrow(() => cancelAgentQuietly({}));
});
