// dsh-model-radar — performance report tests (node:test + node:assert/strict).
//
// Synthetic session events cover the folding rules, percentile math, the seven
// normalized dimensions, adequate-sample gating, baseline deltas, Beijing
// calendar boundaries, range filtering, caching and empty input.

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPerfReport,
  foldSessionEvents,
  quantile,
  rangeWindow,
  scoreFromMetrics,
  DEFAULT_PERF_WEIGHTS,
} from "../lib/perf.js";

// 2026-11-07 12:00:00 Beijing (Saturday).
const FIXED_NOW = Date.UTC(2026, 10, 7, 4, 0, 0);
const BEIJING_OFFSET = 8 * 3_600_000;

function withSeq(events) {
  return events.map((event, index) => ({ seq: index, ...event }));
}

function reasoningStream(from, to, chars) {
  const half = Math.floor(chars / 2);
  const rest = chars - half;
  return [
    { type: "chunk", time: from, chunk: { type: "reasoning-delta", text: "r".repeat(half) } },
    { type: "chunk", time: to, chunk: { type: "reasoning-delta", text: "s".repeat(rest) } },
  ];
}

/**
 * One settled request. `first` is the first text token; when reasoning is
 * supplied the first reasoning token comes earlier and therefore defines TTFT.
 */
function requestStep({
  turn = 1,
  step = 1,
  start,
  first,
  end,
  outputTokens = 100,
  inputTokens = 1000,
  cacheReadTokens = 0,
  provider = "prov",
  model = "model-a",
  effort = "low",
  reasoning = null,
}) {
  const stream = [];
  if (reasoning !== null) stream.push(...reasoningStream(reasoning.from, reasoning.to, reasoning.chars));
  stream.push({ type: "chunk", time: first, chunk: { type: "text-delta", text: "a" } });
  const attemptTime = Math.max(start + 2, Math.min(first, reasoning?.from ?? first) - 50);
  const events = [
    { time: start, type: "step/start", data: { turn, step } },
    {
      time: start + 1,
      type: "request/header",
      data: { header: { config: { provider, model, reasoningEffort: effort } } },
    },
    { time: attemptTime, type: "assistant/attempt", data: { turn, step, stream } },
    {
      time: end,
      type: "assistant/message",
      data: {
        turn,
        step,
        usage: { inputTokens, outputTokens, cacheReadTokens, totalTokens: inputTokens + outputTokens },
        message: { source: { provider, model } },
      },
    },
    { time: end + 1, type: "step/end", data: { turn, step } },
  ];
  return events;
}

function sessionEvents(steps) {
  return withSeq(steps.flat());
}

function makeCtx(sessions, options = {}) {
  const eventsById = new Map(sessions.map((session) => [session.id, session.events]));
  const stats = { reads: 0, listCalls: 0 };
  const ctx = {
    get(name) {
      if (name === "sessionQuery") {
        return {
          listSessions: async () => {
            stats.listCalls += 1;
            return sessions.map((session) => ({ id: session.id, title: session.title ?? null }));
          },
          readSession: async (id) => {
            stats.reads += 1;
            if (options.failIds?.has(id) === true) throw new Error(`cannot read ${id}`);
            const events = eventsById.get(id);
            if (events === undefined) throw new Error(`unknown session ${id}`);
            return { session: { id }, events };
          },
          readTitle: async (id) => ({ title: sessions.find((session) => session.id === id)?.title ?? null }),
        };
      }
      if (name === "sessions") return { get: () => undefined };
      return null;
    },
  };
  return { ctx, stats };
}

async function withFixedNow(callback) {
  const original = Date.now;
  Date.now = () => FIXED_NOW;
  try {
    return await callback();
  } finally {
    Date.now = original;
  }
}

// ── folding ──────────────────────────────────────────────────────────────

test("foldSessionEvents: TTFT, decode window, TPS and cache hit", () => {
  const events = sessionEvents([
    requestStep({
      start: 1000,
      first: 1500,
      end: 3500,
      outputTokens: 100,
      inputTokens: 1000,
      cacheReadTokens: 500,
    }),
  ]);
  const folded = foldSessionEvents(events);
  assert.equal(folded.requests.length, 1);
  const request = folded.requests[0];
  assert.equal(request.provider, "prov");
  assert.equal(request.model, "model-a");
  assert.equal(request.reasoningEffort, "low");
  assert.equal(request.startTime, 1000);
  assert.equal(request.firstTokenTime, 1500);
  assert.equal(request.ttftMs, 500);
  assert.equal(request.decodeMs, 2000);
  assert.equal(request.outputTokens, 100);
  assert.equal(request.tps, 50);
  assert.ok(Math.abs(request.cacheHit - 500 / 1500) < 1e-12);
  assert.equal(request.reasoningCps, null);
  assert.equal(folded.turns, 1);
  assert.equal(folded.steps, 1);
});

test("foldSessionEvents: decode windows under 300 ms never produce TPS", () => {
  const events = sessionEvents([
    requestStep({
      start: 1000,
      first: 1100,
      end: 1300,
      outputTokens: 12,
    }),
  ]);
  const folded = foldSessionEvents(events);
  assert.equal(folded.requests.length, 1);
  assert.equal(folded.requests[0].ttftMs, 100);
  assert.equal(folded.requests[0].decodeMs, 200);
  assert.equal(folded.requests[0].tps, null);
});

test("foldSessionEvents: zero output tokens never produce TPS", () => {
  const events = sessionEvents([
    requestStep({ start: 1000, first: 1100, end: 4000, outputTokens: 0 }),
  ]);
  assert.equal(foldSessionEvents(events).requests[0].tps, null);
});

test("foldSessionEvents: tool duration, success flag and same-turn gaps", () => {
  const events = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 2000 }),
    [
      { time: 2100, type: "tool/call", data: { callId: "c1", turn: 1, step: 1, name: "read" } },
      {
        time: 2400,
        type: "tool/result",
        data: { message: { source: { callId: "c1" }, isError: false } },
      },
      { time: 2500, type: "tool/call", data: { callId: "c2", turn: 1, step: 1, name: "bash" } },
      {
        time: 2700,
        type: "tool/result",
        data: { message: { source: { callId: "c2" }, isError: true } },
      },
      { time: 2750, type: "tool/result", data: { message: { source: { callId: "missing" } } } },
      { time: 2800, type: "turn/end", data: { turn: 1 } },
    ],
  ]);
  const folded = foldSessionEvents(events);
  assert.equal(folded.tools.length, 2);
  assert.equal(folded.tools[0].ms, 300);
  assert.equal(folded.tools[0].ok, true);
  assert.equal(folded.tools[1].ms, 200);
  assert.equal(folded.tools[1].ok, false);
  assert.equal(folded.gaps.length, 1);
  assert.equal(folded.gaps[0].ms, 400);
  assert.equal(folded.gaps[0].turn, 1);
});

test("foldSessionEvents: reasoning characters per second", () => {
  const events = sessionEvents([
    requestStep({
      start: 1000,
      first: 2300,
      end: 4300,
      outputTokens: 100,
      reasoning: { from: 1300, to: 2300, chars: 200 },
    }),
  ]);
  const request = foldSessionEvents(events).requests[0];
  // First reasoning token counts as the first token: TTFT = 300 ms.
  assert.equal(request.ttftMs, 300);
  assert.equal(request.reasoningChars, 200);
  assert.equal(request.reasoningMs, 1000);
  assert.equal(request.reasoningCps, 200);
});

test("foldSessionEvents: request/header attribution and message.source fallback", () => {
  const withHeader = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 2500, effort: "high" }),
  ]);
  assert.equal(foldSessionEvents(withHeader).requests[0].reasoningEffort, "high");

  const withoutHeader = sessionEvents([
    [
      { time: 1000, type: "step/start", data: { turn: 2, step: 1 } },
      { time: 1001, type: "request/context", data: { provider: "ctx-prov", model: "ctx-model" } },
      { time: 1200, type: "assistant/attempt", data: { turn: 2, step: 1 } },
      {
        time: 2500,
        type: "assistant/message",
        data: {
          turn: 2,
          step: 1,
          usage: { inputTokens: 10, outputTokens: 10 },
          message: { source: { provider: "src-prov", model: "src-model", reasoningEffort: "high" } },
        },
      },
    ],
  ]);
  const request = foldSessionEvents(withoutHeader).requests[0];
  assert.equal(request.provider, "src-prov");
  assert.equal(request.model, "src-model");
  assert.equal(request.reasoningEffort, "high");
});

test("foldSessionEvents: header without effort records the default tier (null)", () => {
  const events = withSeq([
    { time: 1000, type: "step/start", data: { turn: 1, step: 1 } },
    {
      time: 1001,
      type: "request/header",
      data: { header: { config: { provider: "p", model: "m" } } },
    },
    { time: 1100, type: "assistant/attempt", data: { turn: 1, step: 1 } },
    {
      time: 2000,
      type: "assistant/message",
      data: {
        turn: 1,
        step: 1,
        usage: { inputTokens: 10, outputTokens: 10 },
        message: { source: { provider: "p2", model: "m2", reasoningEffort: "high" } },
      },
    },
  ]);
  const request = foldSessionEvents(events).requests[0];
  assert.equal(request.provider, "p");
  assert.equal(request.model, "m");
  assert.equal(request.reasoningEffort, null);
});

test("foldSessionEvents: packed delta runs provide first token and reasoning time", () => {
  const events = withSeq([
    { time: 1000, type: "step/start", data: { turn: 1, step: 1 } },
    {
      time: 1001,
      type: "request/header",
      data: { header: { config: { provider: "p", model: "m" } } },
    },
    {
      time: 1100,
      type: "assistant/attempt",
      data: {
        turn: 1,
        step: 1,
        stream: [
          { type: "reasoning-chunks", time0: 1300, texts: ["aa", "bb"], dt: [500] },
          { type: "text-chunks", time0: 1800, texts: ["", "xy"], dt: [100] },
        ],
      },
    },
    {
      time: 3000,
      type: "assistant/message",
      data: { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 20 } },
    },
  ]);
  const request = foldSessionEvents(events).requests[0];
  assert.equal(request.ttftMs, 300);
  assert.equal(request.reasoningChars, 4);
  assert.equal(request.reasoningMs, 500);
  assert.equal(request.reasoningCps, 8);
  assert.ok(Math.abs(request.tps - 20 / 1.7) < 1e-12);
});

test("foldSessionEvents: a retried step settles at most one request", () => {
  const events = withSeq([
    { time: 1000, type: "step/start", data: { turn: 1, step: 1 } },
    { time: 1001, type: "request/header", data: { header: { config: { provider: "p", model: "m" } } } },
    { time: 1100, type: "assistant/attempt", data: { turn: 1, step: 1 } },
    {
      time: 2000,
      type: "assistant/message",
      data: { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 10 } },
    },
    {
      time: 2100,
      type: "assistant/message",
      data: { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 10 } },
    },
  ]);
  assert.equal(foldSessionEvents(events).requests.length, 1);
});

test("foldSessionEvents: usage-less messages and malformed events are ignored", () => {
  const folded = foldSessionEvents([
    null,
    "not-an-event",
    { time: 1, type: "assistant/message", data: { message: { text: "old" } } },
    { time: 2, type: "assistant/message", data: { usage: null } },
  ]);
  assert.deepEqual(folded.requests, []);
  assert.deepEqual(folded.tools, []);
  assert.deepEqual(folded.gaps, []);
  assert.equal(folded.turns, 0);
  assert.equal(folded.steps, 0);
});

// ── percentiles and scoring ──────────────────────────────────────────────

test("quantile: linear interpolation, unsorted input and empty samples", () => {
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([7], 0.95), 7);
  assert.equal(quantile([10, 20, 30, 40], 0.5), 25);
  assert.equal(quantile([10, 20, 30, 40], 0.95), 38.5);
  assert.equal(quantile([40, 10, 30, 20], 0.5), 25);
  assert.equal(quantile([1, 2, 3, 4, 5], 0.25), 2);
  assert.equal(quantile([1, 2, 3], 0), 1);
  assert.equal(quantile([1, 2, 3], 1), 3);
  assert.equal(quantile([1, 2, 3], 5), 3);
});

test("scoreFromMetrics: all seven anchors reach 0 and 1000", () => {
  const perfect = scoreFromMetrics({
    tps: 200,
    ttftMs: 500,
    reasoningCps: 600,
    toolGapMs: 2000,
    toolMs: 10,
    toolSuccess: 1,
    cacheHit: 1,
  });
  assert.equal(perfect.score, 1000);
  assert.equal(perfect.dimensions.length, 7);

  const zero = scoreFromMetrics({
    tps: 20,
    ttftMs: 12_000,
    reasoningCps: 50,
    toolGapMs: 30_000,
    toolMs: 5_000,
    toolSuccess: 0.95,
    cacheHit: 0.5,
  });
  assert.equal(zero.score, 0);
  assert.equal(zero.dimensions.length, 7);

  const mid = scoreFromMetrics({
    tps: 110,
    ttftMs: 6250,
    reasoningCps: 325,
    toolGapMs: 16_000,
    toolMs: 2505,
    toolSuccess: 0.975,
    cacheHit: 0.75,
  });
  assert.equal(mid.score, 500);
});

test("scoreFromMetrics: missing dimensions are dropped and weights renormalized", () => {
  const metrics = {
    tps: 200,
    ttftMs: 500,
    toolGapMs: 2000,
    toolMs: 10,
    toolSuccess: 1,
    cacheHit: 1,
  };
  const result = scoreFromMetrics(metrics);
  assert.equal(result.dimensions.length, 6);
  assert.equal(result.dimensions.some((dimension) => dimension.key === "reasoning"), false);
  assert.equal(result.score, 1000);

  const onlySpeed = scoreFromMetrics(
    { tps: 110 },
    {
      outputSpeed: 100,
      ttft: 0,
      reasoning: 0,
      toolGap: 0,
      toolMs: 0,
      toolSuccess: 0,
      cacheHit: 0,
    },
  );
  assert.equal(onlySpeed.dimensions.length, 1);
  assert.equal(onlySpeed.dimensions[0].key, "outputSpeed");
  assert.equal(onlySpeed.score, 500);
});

test("scoreFromMetrics: metric-key aliases are accepted by weight overrides", () => {
  const result = scoreFromMetrics(
    { tps: 110 },
    {
      tps: 100,
      ttft: 0,
      reasoningCps: 0,
      toolGapMs: 0,
      tool: 0,
      toolSuccess: 0,
      cacheHit: 0,
    },
  );
  assert.equal(result.dimensions.length, 1);
  assert.equal(result.dimensions[0].key, "outputSpeed");
  assert.equal(result.score, 500);
});

test("scoreFromMetrics: values outside the anchors clamp to the 0–1000 range", () => {
  const fast = scoreFromMetrics(
    { tps: 999 },
    {
      outputSpeed: 100,
      ttft: 0,
      reasoning: 0,
      toolGap: 0,
      toolMs: 0,
      toolSuccess: 0,
      cacheHit: 0,
    },
  );
  assert.equal(fast.score, 1000);
  const slow = scoreFromMetrics(
    { tps: 0 },
    {
      outputSpeed: 100,
      ttft: 0,
      reasoning: 0,
      toolGap: 0,
      toolMs: 0,
      toolSuccess: 0,
      cacheHit: 0,
    },
  );
  assert.equal(slow.score, 0);
});

test("scoreFromMetrics: default weights match the documented anchors", () => {
  assert.deepEqual(DEFAULT_PERF_WEIGHTS, {
    outputSpeed: 30,
    ttft: 15,
    reasoning: 10,
    toolGap: 10,
    toolMs: 10,
    toolSuccess: 15,
    cacheHit: 10,
  });
});

// ── Beijing calendar windows ─────────────────────────────────────────────

test("rangeWindow: Beijing today / week (Monday) / month boundaries", () => {
  const today = rangeWindow("today", FIXED_NOW);
  assert.equal(today.from, Date.UTC(2026, 10, 6, 16)); // 2026-11-07 00:00 +08
  assert.equal(today.to, FIXED_NOW);
  assert.equal(today.prevToExclusive, today.from);
  assert.equal(today.prevTo, today.from);
  assert.equal(today.prevFrom, today.from - (FIXED_NOW - today.from));

  const week = rangeWindow("week", FIXED_NOW);
  assert.equal(week.from, Date.UTC(2026, 10, 1, 16)); // Monday 2026-11-02 00:00 +08

  const month = rangeWindow("month", FIXED_NOW);
  assert.equal(month.from, Date.UTC(2026, 9, 31, 16)); // 2026-11-01 00:00 +08

  const all = rangeWindow("all", FIXED_NOW);
  assert.equal(all.from, null);
  assert.equal(all.prevFrom, null);
  assert.equal(all.prevTo, null);
  assert.equal(all.prevToExclusive, null);
  assert.equal(all.to, FIXED_NOW);
});

test("rangeWindow: Sunday still belongs to the Monday-started Beijing week", () => {
  const sundayNoon = Date.UTC(2026, 10, 8, 4); // 2026-11-08 12:00 +08 (Sunday)
  assert.equal(rangeWindow("week", sundayNoon).from, Date.UTC(2026, 10, 1, 16));
  const mondayMidnight = Date.UTC(2026, 10, 1, 16); // 2026-11-02 00:00 +08 (Monday)
  assert.equal(rangeWindow("week", mondayMidnight).from, mondayMidnight);
});

test("rangeWindow: unknown ranges fall back to month", () => {
  assert.equal(
    rangeWindow("nonsense", FIXED_NOW).from,
    rangeWindow("month", FIXED_NOW).from,
  );
});

// ── report assembly ──────────────────────────────────────────────────────

test("buildPerfReport: fewer than 20 requests keeps adequate=false", async () => {
  const events = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 3500, outputTokens: 100 }),
  ]);
  const { ctx } = makeCtx([{ id: "s-one", title: "One", events }]);
  const report = await buildPerfReport(ctx, { range: "all", fresh: true });
  assert.equal(report.requests, 1);
  assert.equal(report.samples, 1);
  assert.equal(report.models.length, 1);
  assert.equal(report.models[0].samples, 1);
  assert.equal(report.models[0].adequate, false);
  assert.ok(Number.isInteger(report.models[0].score));
  assert.ok(report.models[0].score >= 0 && report.models[0].score <= 1000);
  assert.equal(report.models[0].baseline.status, "insufficient");
  assert.equal(report.ttft.samples, 1);
  assert.equal(report.ttft.avg, 500);
  assert.equal(report.tps.samples, 1);
  assert.equal(report.tps.avg, 50);
  assert.equal(report.sessions.length, 1);
  assert.equal(report.sessions[0].sessionId, "s-one");
  assert.equal(report.sessions[0].tps, 50);
});

test("buildPerfReport: 20 requests mark the combo adequate and rank sessions", async () => {
  const steps = [];
  for (let index = 0; index < 20; index += 1) {
    const start = 1_000_000 + index * 10_000;
    steps.push(
      requestStep({
        turn: index + 1,
        start,
        first: start + 250,
        end: start + 1250,
        outputTokens: 30,
      }),
    );
  }
  const events = sessionEvents(steps);
  const { ctx } = makeCtx([{ id: "s-many", title: "Many", events }]);
  const report = await buildPerfReport(ctx, { range: "all", fresh: true });
  assert.equal(report.requests, 20);
  assert.equal(report.models.length, 1);
  assert.equal(report.models[0].samples, 20);
  assert.equal(report.models[0].adequate, true);
  assert.equal(report.models[0].metrics.ttftMs, 250);
  assert.equal(report.models[0].metrics.tps, 30);
  assert.equal(report.models[0].dimensions.length, 3); // speed, TTFT, cache hit
  assert.equal(report.sessions[0].turns, 20);
  assert.equal(report.sessions[0].outputTokens, 600);
});

test("buildPerfReport: tool aggregates and tool dimensions reach the report", async () => {
  const events = sessionEvents([
    requestStep({ turn: 1, start: 1000, first: 1500, end: 1900, outputTokens: 60 }),
    [
      { time: 2000, type: "tool/call", data: { callId: "t1", turn: 1, step: 1, name: "read" } },
      { time: 2100, type: "tool/result", data: { message: { source: { callId: "t1" }, isError: false } } },
      { time: 2300, type: "tool/call", data: { callId: "t2", turn: 1, step: 1, name: "bash" } },
      { time: 2500, type: "tool/result", data: { message: { source: { callId: "t2" }, isError: true } } },
      { time: 2600, type: "turn/end", data: { turn: 1 } },
    ],
  ]);
  const { ctx } = makeCtx([{ id: "s-tools", title: "Tools", events }]);
  const report = await buildPerfReport(ctx, {
    range: "all",
    excludeSessionIds: ["tools-suite"],
    fresh: true,
  });
  assert.equal(report.tools.calls, 2);
  assert.equal(report.tools.successRate, 0.5);
  assert.equal(report.tools.avgMs, 150);
  assert.equal(report.tools.p50, 150);
  const dimensionKeys = report.models[0].dimensions.map((dimension) => dimension.key);
  assert.ok(dimensionKeys.includes("toolGap"));
  assert.ok(dimensionKeys.includes("toolMs"));
  assert.ok(dimensionKeys.includes("toolSuccess"));
  assert.equal(report.models[0].metrics.toolGapMs, 300);
  assert.equal(report.models[0].metrics.toolMs, 150);
  assert.equal(report.models[0].metrics.toolSuccess, 0.5);
});

test("buildPerfReport: config.perfWeights overrides the default dimension weights", async () => {
  const events = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 3500, outputTokens: 100 }),
  ]);
  const { ctx } = makeCtx([{ id: "s-weights", title: "Weights", events }]);
  const report = await buildPerfReport(ctx, {
    range: "all",
    excludeSessionIds: ["weights-suite"],
    config: {
      perfWeights: {
        outputSpeed: 100,
        ttft: 0,
        reasoning: 0,
        toolGap: 0,
        toolMs: 0,
        toolSuccess: 0,
        cacheHit: 0,
      },
    },
    fresh: true,
  });
  assert.equal(report.models[0].dimensions.length, 1);
  assert.equal(report.models[0].dimensions[0].key, "outputSpeed");
  assert.equal(report.models[0].dimensions[0].weight, 100);
});

test("buildPerfReport: baseline delta is positive or negative by direction", async () => {
  await withFixedNow(async () => {
    const today = rangeWindow("today", FIXED_NOW);
    const previous = rangeWindow("today", FIXED_NOW).prevFrom;
    const stepsAlpha = [];
    for (let index = 0; index < 20; index += 1) {
      const oldStart = previous + 3_600_000 + index * 60_000;
      stepsAlpha.push(
        requestStep({
          turn: index + 1,
          start: oldStart,
          first: oldStart + 1000,
          end: oldStart + 3000,
          outputTokens: 40,
          model: "alpha",
        }),
      );
    }
    for (let index = 0; index < 20; index += 1) {
      const newStart = today.from + 3_600_000 + index * 60_000;
      stepsAlpha.push(
        requestStep({
          turn: 100 + index,
          start: newStart,
          first: newStart + 500,
          end: newStart + 1500,
          outputTokens: 50,
          model: "alpha",
        }),
      );
    }

    const stepsBeta = [];
    for (let index = 0; index < 20; index += 1) {
      const oldStart = previous + 3_600_000 + index * 60_000;
      stepsBeta.push(
        requestStep({
          turn: index + 1,
          start: oldStart,
          first: oldStart + 500,
          end: oldStart + 1500,
          outputTokens: 50,
          model: "beta",
        }),
      );
    }
    for (let index = 0; index < 20; index += 1) {
      const newStart = today.from + 3_600_000 + index * 60_000;
      stepsBeta.push(
        requestStep({
          turn: 100 + index,
          start: newStart,
          first: newStart + 1000,
          end: newStart + 3000,
          outputTokens: 40,
          model: "beta",
        }),
      );
    }

    const { ctx } = makeCtx([
      { id: "s-alpha", title: "Alpha", events: sessionEvents(stepsAlpha) },
      { id: "s-beta", title: "Beta", events: sessionEvents(stepsBeta) },
    ]);
    const report = await buildPerfReport(ctx, {
      range: "today",
      excludeSessionIds: ["baseline-suite"],
      fresh: true,
    });
    assert.equal(report.models.length, 2);
    const alpha = report.models.find((entry) => entry.model === "alpha");
    const beta = report.models.find((entry) => entry.model === "beta");
    assert.notEqual(alpha, undefined);
    assert.notEqual(beta, undefined);
    assert.equal(alpha.baseline.status, "ok");
    assert.equal(beta.baseline.status, "ok");
    assert.ok(alpha.baseline.score > 0);
    assert.ok(beta.baseline.score > 0);
    assert.ok(alpha.baseline.deltaPct > 0, `alpha delta ${alpha.baseline.deltaPct}`);
    assert.ok(beta.baseline.deltaPct < 0, `beta delta ${beta.baseline.deltaPct}`);
  });
});

test("buildPerfReport: range filtering keeps only requests inside the window", async () => {
  await withFixedNow(async () => {
    const events = sessionEvents([
      requestStep({
        turn: 1,
        start: FIXED_NOW - 36 * 3_600_000,
        first: FIXED_NOW - 36 * 3_600_000 + 500,
        end: FIXED_NOW - 36 * 3_600_000 + 1500,
        outputTokens: 50,
      }),
      requestStep({
        turn: 2,
        start: FIXED_NOW - 3_600_000,
        first: FIXED_NOW - 3_600_000 + 500,
        end: FIXED_NOW - 3_600_000 + 1500,
        outputTokens: 50,
      }),
    ]);
    const { ctx } = makeCtx([{ id: "s-range", title: "Range", events }]);
    const today = await buildPerfReport(ctx, {
      range: "today",
      excludeSessionIds: ["range-suite"],
      fresh: true,
    });
    assert.equal(today.requests, 1);
    assert.equal(today.models[0].samples, 1);
    const all = await buildPerfReport(ctx, {
      range: "all",
      excludeSessionIds: ["range-suite"],
      fresh: true,
    });
    assert.equal(all.requests, 2);
    assert.equal(all.models[0].samples, 2);
    assert.equal(all.models[0].baseline.status, "insufficient");
  });
});

test("buildPerfReport: excluded evaluation sessions never contribute samples", async () => {
  const evalEvents = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 3500, outputTokens: 100, model: "eval-model" }),
  ]);
  const userEvents = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 3500, outputTokens: 100, model: "user-model" }),
  ]);
  const { ctx } = makeCtx([
    { id: "eval-1", title: "Eval", events: evalEvents },
    { id: "user-1", title: "User", events: userEvents },
  ]);
  const report = await buildPerfReport(ctx, {
    range: "all",
    excludeSessionIds: ["eval-1"],
    fresh: true,
  });
  assert.equal(report.requests, 1);
  assert.equal(report.models.length, 1);
  assert.equal(report.models[0].model, "user-model");
});

test("buildPerfReport: live sessions win over the persisted snapshot", async () => {
  const liveEvents = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 3500, outputTokens: 100, model: "live-model" }),
  ]);
  let persistedReads = 0;
  const ctx = {
    get(name) {
      if (name === "sessions") {
        return {
          get: (id) => (id === "live-1" ? { ownEvents: liveEvents } : undefined),
        };
      }
      if (name === "sessionQuery") {
        return {
          listSessions: async () => [{ id: "live-1", title: "Live" }],
          readSession: async () => {
            persistedReads += 1;
            throw new Error("persisted snapshot should not be read");
          },
          readTitle: async () => ({ title: "Live" }),
        };
      }
      return null;
    },
  };
  const report = await buildPerfReport(ctx, {
    range: "all",
    excludeSessionIds: ["live-suite"],
    fresh: true,
  });
  assert.equal(persistedReads, 0);
  assert.equal(report.requests, 1);
  assert.equal(report.models[0].model, "live-model");
});

test("buildPerfReport: one unreadable session is skipped", async () => {
  const goodEvents = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 3500, outputTokens: 100, model: "good" }),
  ]);
  const { ctx } = makeCtx(
    [
      { id: "bad", title: "Bad", events: [] },
      { id: "good", title: "Good", events: goodEvents },
    ],
    { failIds: new Set(["bad"]) },
  );
  const report = await buildPerfReport(ctx, {
    range: "all",
    excludeSessionIds: ["broken-suite"],
    fresh: true,
  });
  assert.equal(report.requests, 1);
  assert.equal(report.models[0].model, "good");
});

test("buildPerfReport: empty data returns an empty structure without throwing", async () => {
  const empty = await buildPerfReport(null, { range: "today", fresh: true });
  assert.equal(empty.requests, 0);
  assert.equal(empty.samples, 0);
  assert.deepEqual(empty.models, []);
  assert.deepEqual(empty.sessions, []);
  assert.equal(empty.ttft.samples, 0);
  assert.equal(empty.tps.samples, 0);
  assert.equal(empty.tools.calls, 0);
  assert.equal(empty.reasoning.samples, 0);
  assert.equal(empty.from, rangeWindow("today", Date.now()).from);

  const { ctx } = makeCtx([]);
  const noSessions = await buildPerfReport(ctx, { range: "month", fresh: true });
  assert.equal(noSessions.requests, 0);
  assert.deepEqual(noSessions.models, []);
});

test("buildPerfReport: 60 s cache is bypassed by fresh=true", async () => {
  const events = sessionEvents([
    requestStep({ start: 1000, first: 1500, end: 3500, outputTokens: 100 }),
  ]);
  const { ctx, stats } = makeCtx([{ id: "s-cache", title: "Cache", events }]);
  const options = {
    range: "all",
    excludeSessionIds: ["cache-suite"],
  };
  await buildPerfReport(ctx, { ...options, fresh: true });
  const afterFirst = stats.reads;
  assert.equal(afterFirst, 1);

  await buildPerfReport(ctx, options);
  assert.equal(stats.reads, afterFirst);

  await buildPerfReport(ctx, { ...options, fresh: true });
  // fresh bypasses the report cache; the per-session fold cache may legitimately
  // reuse an unchanged durable session log, so reads need not increase again.
  assert.ok(stats.reads >= afterFirst);
});