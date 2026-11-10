import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  comboTotal,
  extractCandyAnswer,
  gradeJudgeResult,
  qinCompletionCap,
  score100ToWeighted,
  scoreCandy,
  scorePompeii,
  turnCutByMaxTokens,
  validatePompeii,
} from "../lib/scoring.js";
import { CANDY_ANSWER, GOLD_EDGES, TASKS } from "../lib/tasks.js";

const FIXTURE_URL = new URL("./fixtures/pompeii-answers.json", import.meta.url);
const fixtures = JSON.parse(await readFile(FIXTURE_URL, "utf8"));

function toRawAnswer(edges) {
  return JSON.stringify({ edges: edges.map(([a, b]) => ({ a, b })) });
}

test("pompeii fixtures cover the four calibrated rewards", () => {
  assert.equal(fixtures.length, 4);
  assert.deepEqual(
    fixtures.map((fixture) => fixture.name),
    ["case-1", "case-2", "case-3", "case-4"],
  );
  assert.deepEqual(
    fixtures.map((fixture) => fixture.expectedReward),
    [0.357143, 0.272727, 0.571429, 0],
  );
  assert.deepEqual(
    fixtures.map((fixture) => fixture.expectedScore),
    [16.07, 12.27, 25.71, 0],
  );
  for (const fixture of fixtures) {
    assert.ok(Array.isArray(fixture.edges));
    for (const edge of fixture.edges) {
      assert.equal(edge.length, 2);
      assert.ok(edge[0] < edge[1], `${fixture.name} edge ${edge.join("-")} is not normalized`);
    }
  }
});

for (const fixture of fixtures) {
  test(`scorePompeii reproduces real answer ${fixture.name}`, () => {
    const result = scorePompeii(toRawAnswer(fixture.edges), GOLD_EDGES);
    assert.equal(result.formatError, null);
    assert.equal(result.score, fixture.expectedScore);
    assert.ok(
      Math.abs(result.f1 - fixture.expectedReward) < 1e-4,
      `${fixture.name}: f1 ${result.f1} != reward ${fixture.expectedReward}`,
    );
    assert.equal(result.tp + result.fp, fixture.edges.length);
    assert.equal(result.tp + result.fn, GOLD_EDGES.length);
  });
}

const malformedAnswers = [
  ["non-JSON text", "this is not json"],
  ["unexpected top-level key", { edges: [], note: "extra" }],
  ["unexpected edge key", { edges: [{ a: "A", b: "B", weight: 1 }] }],
  ["duplicate edge", { edges: [{ a: "A", b: "B" }, { a: "B", b: "A" }] }],
  ["self edge", { edges: [{ a: "C", b: "C" }] }],
  ["label outside A-I", { edges: [{ a: "A", b: "J" }] }],
  ["edges is not an array", { edges: "A-B" }],
  ["too many edges", { edges: Array.from({ length: 37 }, () => ({ a: "A", b: "B" })) }],
];

for (const [name, raw] of malformedAnswers) {
  test(`scorePompeii gives 0 with formatError for ${name}`, () => {
    const result = scorePompeii(raw, GOLD_EDGES);
    assert.equal(result.score, 0);
    assert.equal(result.f1, 0);
    assert.equal(typeof result.formatError, "string");
    assert.notEqual(result.formatError, "");
    assert.deepEqual(result.answer, { edges: [] });
  });
}

test("an empty answer text is a format error", () => {
  const validation = validatePompeii("   ");
  assert.equal(validation.ok, false);
  assert.equal(validation.formatError, "empty answer");
  const result = scorePompeii("", GOLD_EDGES);
  assert.equal(result.score, 0);
  assert.equal(result.formatError, "empty answer");
});

test("empty edges is a valid answer worth 0", () => {
  const validation = validatePompeii({ edges: [] });
  assert.deepEqual(validation, { ok: true, formatError: null, edges: [] });

  const result = scorePompeii({ edges: [] }, GOLD_EDGES);
  assert.equal(result.score, 0);
  assert.equal(result.formatError, null);
  assert.equal(result.f1, 0);
  assert.equal(result.fp, 0);
  assert.equal(result.fn, GOLD_EDGES.length);
});

test("validatePompeii normalizes edge order to a<b", () => {
  const result = validatePompeii({
    edges: [
      { a: "I", b: "A" },
      { a: "B", b: "C" },
      { a: "H", b: "B" },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.formatError, null);
  assert.deepEqual(result.edges, ["A-I", "B-C", "B-H"]);
});

test("validatePompeii accepts JSON inside a markdown fence", () => {
  const result = validatePompeii('```json\n{"edges":[{"a":"H","b":"I"}]}\n```');
  assert.equal(result.ok, true);
  assert.deepEqual(result.edges, ["H-I"]);
});

test("validatePompeii rejects duplicate edges after normalization", () => {
  const result = validatePompeii({ edges: [{ a: "A", b: "B" }, { a: "B", b: "A" }] });
  assert.equal(result.ok, false);
  assert.equal(result.formatError, "duplicate edge");
  assert.deepEqual(result.edges, []);
});

test("scoreCandy extracts explicit answer markers", () => {
  const full = scoreCandy("推导略。\n最终答案：15");
  assert.equal(full.score, 22.5);
  assert.equal(full.answer, 15);
  assert.equal(full.ok, true);
  assert.equal(full.maxScore, 22.5);

  const wrong = scoreCandy("答案是 14");
  assert.equal(wrong.score, 0);
  assert.equal(wrong.answer, 14);
  assert.equal(wrong.ok, false);

  const none = scoreCandy("没有数字");
  assert.equal(none.score, 0);
  assert.equal(none.answer, null);
  assert.equal(none.ok, false);

  const lastWins = scoreCandy("先算 14，最后答案是 15");
  assert.equal(lastWins.score, 22.5);
  assert.equal(lastWins.answer, 15);
});

test("scoreCandy ignores a trailing construction after the answer", () => {
  const text = "即最少取 **15 颗**：先取 6 颗圆形，再取 9 颗五角星形。";
  assert.equal(extractCandyAnswer(text), 15);
  assert.equal(scoreCandy(text).score, 22.5);

  const boxed = "所以：\n\\[\n\\boxed{15}\n\\]\n\n即最少取 **15 颗**，先取 6 颗圆形，再取 9 颗五角星形。";
  assert.equal(extractCandyAnswer(boxed), 15);
  assert.equal(scoreCandy(boxed).score, 22.5);

  const fallback = "推理 6 颗与 9 颗之后，结论是 15";
  assert.equal(extractCandyAnswer(fallback), 15);
  assert.equal(scoreCandy("推理 6 颗与 9 颗之后，结论是 14").answer, 14);
});

test("comboTotal sums all four done tasks", () => {
  const byTask = { candy: 22.5, pompeii: 40.5, pelican: 18, qin: 52 };
  const runs = TASKS.map((task) => ({ taskId: task.id, status: "done", score: byTask[task.id] }));
  const result = comboTotal(runs);

  assert.equal(result.complete, true);
  assert.equal(result.total, 133);
  assert.equal(result.maxScore, 150);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.scores, byTask);
  assert.deepEqual(result.statuses, {
    candy: "done",
    pompeii: "done",
    pelican: "done",
    qin: "done",
  });
});

test("comboTotal is null when one task is missing", () => {
  const runs = [
    { taskId: "candy", status: "done", score: 22.5 },
    { taskId: "pompeii", status: "done", score: 40.5 },
    { taskId: "pelican", status: "done", score: 18 },
  ];
  const result = comboTotal(runs);

  assert.equal(result.complete, false);
  assert.equal(result.total, null);
  assert.deepEqual(result.missing, ["qin"]);
  assert.equal(result.scores.qin, null);
  assert.equal(result.statuses.qin, "missing");
});

test("comboTotal is null when a judge-scored run failed", () => {
  const runs = TASKS.map((task) => ({ taskId: task.id, status: "done", score: 1 }));
  runs[3] = { taskId: "qin", status: "judge_error", score: 0 };
  const result = comboTotal(runs);

  assert.equal(result.complete, false);
  assert.equal(result.total, null);
  assert.deepEqual(result.missing, ["qin"]);
  assert.equal(result.scores.qin, null);
  assert.equal(result.statuses.qin, "judge_error");
});

test("Candy calibration answer stays 15", () => {
  assert.equal(CANDY_ANSWER, 15);
  assert.equal(scoreCandy(String(CANDY_ANSWER)).score, 22.5);
});
test("every task exposes a 0-100 raw score alongside its weighted contribution", () => {
  const perfect = scorePompeii(
    { edges: GOLD_EDGES.map(([a, b]) => ({ a, b })) },
    GOLD_EDGES,
  );
  assert.equal(perfect.score100, 100);
  assert.equal(perfect.score, 45);
  const half = scorePompeii(
    { edges: GOLD_EDGES.slice(0, 8).map(([a, b]) => ({ a, b })) },
    GOLD_EDGES,
  );
  assert.ok(half.score100 > 0 && half.score100 < 100);
  assert.equal(half.score, Number(((half.score100 * 45) / 100).toFixed(2)));

  const right = scoreCandy("最终答案：15");
  assert.equal(right.score100, 100);
  assert.equal(right.score, 22.5);
  const wrong = scoreCandy("最终答案：14");
  assert.equal(wrong.score100, 0);
  assert.equal(wrong.score, 0);
});

test("score100ToWeighted converts a 100-scale score into the task weight", () => {
  assert.equal(score100ToWeighted("qin", 59), 35.4);
  assert.equal(score100ToWeighted("qin", 100), 60);
  assert.equal(score100ToWeighted("pelican", 96), 21.6);
  assert.equal(score100ToWeighted("pelican", 0), 0);
  assert.equal(score100ToWeighted("qin", 150), 60);
});

test("qinCompletionCap mirrors the codexradar CORE_COMPLETENESS gate", () => {
  const confirmed = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`R${i + 1}`, "confirmed"]));
  assert.equal(qinCompletionCap(confirmed).cap, 100);

  const onePartial = { ...confirmed, R7: "partial" };
  assert.equal(qinCompletionCap(onePartial).cap, 79);

  const twoPartial = { ...confirmed, R6: "partial", R7: "partial" };
  assert.equal(qinCompletionCap(twoPartial).cap, 69);

  const oneNotMet = { ...confirmed, R7: "not_met" };
  assert.equal(qinCompletionCap(oneNotMet).cap, 69);

  const twoNotMet = { ...confirmed, R2: "not_met", R7: "not_met" };
  assert.equal(qinCompletionCap(twoNotMet).cap, 59);

  const aliasKeys = qinCompletionCap({ r1: "CONFIRMED", r2: "confirmed", r3: "confirmed", r4: "confirmed", r5: "confirmed", r6: "confirmed", r7: "confirmed." });
  assert.equal(aliasKeys.cap, 100);

  const missing = qinCompletionCap(null);
  assert.equal(missing.missing, true);
  assert.equal(missing.cap, 69);
});

test("gradeJudgeResult keeps the 100-scale raw score, applies the qin cap, then weights", () => {
  const pelican = gradeJudgeResult("pelican", {
    ok: true,
    score100: 96,
    core: null,
    breakdown: { pelican_identity: 12 },
  });
  assert.equal(pelican.score100, 96);
  assert.equal(pelican.score, 21.6);
  assert.equal(pelican.grade.score100, 96);

  const qin = gradeJudgeResult("qin", {
    ok: true,
    score100: 92,
    core: { R1: "confirmed", R2: "confirmed", R3: "confirmed", R4: "confirmed", R5: "not_met", R6: "partial", R7: "confirmed" },
    breakdown: { A1: 4 },
  });
  // One not_met relation caps the final score at 69; 69 * 0.6 = 41.4.
  assert.equal(qin.score100, 69);
  assert.equal(qin.score, 41.4);
  assert.equal(qin.grade.cap, 69);
  assert.equal(qin.grade.score100, 92);
  assert.equal(qin.grade.weighted, 41.4);

  assert.equal(gradeJudgeResult("qin", { ok: false }), null);
});

test("turnCutByMaxTokens recognises the output-budget cutoff", () => {
  assert.equal(turnCutByMaxTokens([{ type: "turn/end", data: { reason: { kind: "max-tokens" } } }]), true);
  assert.equal(turnCutByMaxTokens([{ type: "turn/end", data: { reason: { kind: "completed" } } }]), false);
  assert.equal(turnCutByMaxTokens([{ type: "turn/end", data: { reason: { kind: "max-tokens" } } }, { type: "turn/end", data: { reason: { kind: "completed" } } }]), false);
  assert.equal(turnCutByMaxTokens([]), false);
});
