import test from "node:test";
import assert from "node:assert/strict";

import { parseJudgeReply } from "../lib/judge.js";

test("parseJudgeReply accepts a plain JSON object", () => {
  const reply = parseJudgeReply(
    JSON.stringify({
      score: 8,
      breakdown: { elements: 24, relations: 16, quality: 12, answer: 8 },
      reason: "元素齐全，关系正确。",
    }),
    60,
  );

  assert.equal(reply.ok, true);
  assert.equal(reply.score, 8);
  assert.deepEqual(reply.breakdown, { elements: 24, relations: 16, quality: 12, answer: 8 });
  assert.equal(reply.reason, "元素齐全，关系正确。");
});

test("parseJudgeReply accepts a JSON code block", () => {
  const reply = parseJudgeReply('```json\n{"score": 7.5, "breakdown": {"quality": 3}}\n```', 22.5);

  assert.equal(reply.ok, true);
  assert.equal(reply.score, 7.5);
  assert.deepEqual(reply.breakdown, { quality: 3 });
  assert.equal(reply.reason, "");
});

test("parseJudgeReply accepts surrounding prose", () => {
  const reply = parseJudgeReply('评分如下：\n{"score": 21, "reason": "糖果题答对了"}\n以上。', 60);

  assert.equal(reply.ok, true);
  assert.equal(reply.score, 21);
  assert.equal(reply.reason, "糖果题答对了");
});

test("parseJudgeReply accepts both score boundaries", () => {
  assert.equal(parseJudgeReply('{"score": 0}', 60).ok, true);
  assert.equal(parseJudgeReply('{"score": 60}', 60).ok, true);
});

test("parseJudgeReply rejects a score outside 0-maxScore", () => {
  for (const score of [-1, 61]) {
    const reply = parseJudgeReply(JSON.stringify({ score }), 60);
    assert.equal(reply.ok, false);
    assert.match(reply.error, /outside 0-60/);
    assert.equal(reply.score, undefined);
  }
});

test("parseJudgeReply rejects a non-JSON reply", () => {
  const reply = parseJudgeReply("我觉得这个回答还不错。", 60);
  assert.equal(reply.ok, false);
  assert.match(reply.error, /no JSON object/);
});

test("parseJudgeReply rejects an empty reply", () => {
  const reply = parseJudgeReply("   ", 60);
  assert.equal(reply.ok, false);
  assert.equal(reply.error, "empty judge reply");
});

test("parseJudgeReply downgrades a non-object breakdown to {}", () => {
  const fromString = parseJudgeReply('{"score": 5, "breakdown": "bad"}', 60);
  assert.equal(fromString.ok, true);
  assert.deepEqual(fromString.breakdown, {});

  const fromArray = parseJudgeReply('{"score": 5, "breakdown": [1, 2]}', 60);
  assert.equal(fromArray.ok, true);
  assert.deepEqual(fromArray.breakdown, {});

  const fromNull = parseJudgeReply('{"score": 5, "breakdown": null}', 60);
  assert.equal(fromNull.ok, true);
  assert.deepEqual(fromNull.breakdown, {});
});

test("parseJudgeReply reads a 100-scale score and the qin core statuses", () => {
  const reply = parseJudgeReply(
    JSON.stringify({
      score: 95,
      breakdown: { A1: 4, F3: 10 },
      core: { R1: "confirmed", R2: "confirmed", R3: "confirmed", R4: "confirmed", R5: "confirmed", R6: "partial", R7: "confirmed" },
      reason: "整体完整，喊话尾端略偏",
    }),
    100,
  );
  assert.equal(reply.ok, true);
  assert.equal(reply.score, 95);
  assert.equal(reply.core.R6, "partial");
});

test("parseJudgeReply rejects a 101 score on the 100 scale", () => {
  assert.equal(parseJudgeReply('{"score": 101}', 100).ok, false);
});
